import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { measureBaseline } from '../common/performance/baseline';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import {
  businessCalendarRangeToUtc,
  calendarDateInTimeZone,
  formatBillDateApi,
  isDateOnlyString,
  parseDateOnlyUtc,
} from '../common/datetime/datetime';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { Prisma } from '../generated/prisma/client';
import { franchiseRegion } from '../common/regional';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import {
  aggregateAdminBills,
  type AdminReportSnapshot,
  type ReportService,
} from './admin-report-data';
import {
  buildAdminWorkbook,
  adminReportFileName,
  XLSX_CONTENT_TYPE,
} from './admin-report-workbook';
import {
  REPORT_QUEUE,
  REPORT_JOB_ADMIN_EXPORT,
  AdminReportJobPayload,
} from './report.constants';

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timezone: BusinessTimezoneService,
    @Optional()
    @InjectQueue(REPORT_QUEUE)
    private readonly reportQueue?: Queue<AdminReportJobPayload>,
  ) {}

  private franchise(user: AuthenticatedUser) {
    if (user.role !== RoleCode.ADMIN || !user.franchiseId)
      throw new ForbiddenException('Franchise Admin access is required');
    return user.franchiseId;
  }

  async snapshot(
    user: AuthenticatedUser,
    query: AdminReportQueryDto,
  ): Promise<AdminReportSnapshot> {
    const franchiseId = this.franchise(user);
    if (query.reportType && query.reportType !== 'overview')
      throw new BadRequestException('Only Overview reports are supported');
    const timeZone = await this.timezone.resolveForUser(user);
    const today = calendarDateInTimeZone(timeZone);
    const dateFrom = query.dateFrom ?? `${today.slice(0, 7)}-01`;
    const dateTo = query.dateTo ?? today;
    if (
      !isDateOnlyString(dateFrom) ||
      !isDateOnlyString(dateTo) ||
      dateFrom > dateTo
    )
      throw new BadRequestException('Choose a valid date range');
    if (
      parseDateOnlyUtc(dateTo).getTime() -
        parseDateOnlyUtc(dateFrom).getTime() >
      3660 * 86400000
    )
      throw new BadRequestException('Choose a range of ten years or less');
    const interval = query.interval ?? 'day';
    if (!['day', 'week', 'month'].includes(interval))
      throw new BadRequestException('Invalid reporting interval');
    const instantRange = businessCalendarRangeToUtc(dateFrom, dateTo, timeZone);
    const calendarEnd = new Date(parseDateOnlyUtc(dateTo).getTime() + 86400000);
    return this.prisma.$transaction(
      async (tx) => {
        const franchise = await tx.franchise.findUnique({
          where: { id: franchiseId },
          select: { preferences: true },
        });
        const branches = await tx.salon.findMany({
          where: { franchiseId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
        const selected = query.branchId
          ? branches.find((b) => b.id === query.branchId)
          : null;
        if (query.branchId && !selected)
          throw new ForbiddenException('Branch is outside your franchise');
        const salonScope = {
          franchiseId,
          ...(query.branchId ? { id: query.branchId } : {}),
        };
        const where: Prisma.BillWhereInput = {
          salon: salonScope,
          OR: [
            { billDate: { gte: parseDateOnlyUtc(dateFrom), lt: calendarEnd } },
            { billDate: instantRange },
          ],
        };
        // Page on the server; never silently use a latest-100 sample or send bill details to React.
        const count = await tx.bill.count({ where });
        if (count > 50000)
          throw new BadRequestException(
            'This report exceeds 50,000 bills. Select a shorter date range or one branch',
          );
        const bills: AdminReportSnapshot['bills'] = [];
        const serviceMap = new Map<string, ReportService>();
        const methodMap = new Map<
          string,
          { name: string; revenue: number; payments: number }
        >();
        let successful = 0,
          failed = 0,
          attempts = 0;
        let cursor: string | undefined;
        while (true) {
          const batch = await tx.bill.findMany({
            where,
            orderBy: { id: 'asc' },
            take: 1000,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
              salon: { select: { name: true } },
              customer: {
                select: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              items: true,
              payments: true,
            },
          });
          for (const b of batch) {
            const date = formatBillDateApi(b.billDate, timeZone);
            if (date < dateFrom || date > dateTo) continue;
            bills.push({
              id: b.id,
              billNumber: b.billNumber,
              date,
              branchId: b.salonId,
              branch: b.salon.name,
              customerId: b.customerId,
              customer:
                `${b.customer.user.firstName} ${b.customer.user.lastName}`.trim(),
              subtotal: Number(b.subtotal),
              discount: Number(b.discount),
              tax: Number(b.tax),
              total: Number(b.total),
              collected: Number(b.paidAmount),
              status: b.status,
              paymentStatus: b.paymentStatus,
              paymentMethods: [
                ...new Set(
                  b.payments
                    .filter((p) => p.status === 'SUCCESS')
                    .map((p) => p.paymentMethod),
                ),
              ].join(', '),
            });
            if (b.status !== 'COMPLETED') continue;
            for (const it of b.items) {
              if (it.itemType !== 'SERVICE') continue;
              const id = it.serviceId ?? `item:${it.id}`;
              const entry = serviceMap.get(id) ?? {
                id,
                name: it.description?.trim() || 'Unnamed service',
                revenue: 0,
                quantity: 0,
              };
              entry.revenue += Number(it.total);
              entry.quantity += it.quantity;
              serviceMap.set(id, entry);
            }
            for (const p of b.payments) {
              attempts++;
              if (p.status === 'FAILED') failed++;
              if (p.status !== 'SUCCESS') continue;
              successful++;
              const entry = methodMap.get(p.paymentMethod) ?? {
                name: p.paymentMethod,
                revenue: 0,
                payments: 0,
              };
              entry.revenue += Number(p.amount);
              entry.payments++;
              methodMap.set(p.paymentMethod, entry);
            }
          }
          if (batch.length < 1000) break;
          cursor = batch.at(-1)!.id;
        }
        const [totalCustomers, totalServices, totalStaff, actor] =
          await Promise.all([
            tx.customer.count({
              where: { bills: { some: { salon: salonScope } } },
            }),
            tx.service.count({ where: { salon: salonScope } }),
            tx.user.count({
              where: {
                franchiseId,
                ...(query.branchId ? { salonId: query.branchId } : {}),
                role: { code: { in: ['ADMIN', 'MANAGER', 'STAFF'] } },
              },
            }),
            tx.user.findUnique({
              where: { id: user.userId },
              select: { firstName: true, lastName: true },
            }),
          ]);
        const aggregates = aggregateAdminBills(
          bills,
          selected ? [selected] : branches,
          interval,
        );
        return {
          kind: 'FRANCHISE_OVERVIEW',
          currency: franchiseRegion(franchise?.preferences).currency,
          dateFormat: franchiseRegion(franchise?.preferences).dateFormat,
          status: 'Ready',
          dateFrom,
          dateTo,
          branchId: query.branchId ?? null,
          branch: selected?.name ?? 'All Branches',
          timeZone,
          interval,
          generatedOn: new Date().toISOString(),
          generatedBy: actor
            ? `${actor.firstName} ${actor.lastName}`.trim()
            : user.email,
          stats: {
            totalRevenue: aggregates.totalRevenue,
            totalBills: bills.length,
            totalCustomers,
            totalServices,
            totalStaff,
          },
          bills,
          revenueSeries: aggregates.revenueSeries,
          branchComparison: aggregates.branchComparison,
          customers: aggregates.customers,
          billsOverview: aggregates.billsOverview,
          services: [...serviceMap.values()],
          branches,
          payments: {
            successful,
            failed,
            attempts,
            successRate: attempts ? successful / attempts : null,
            methods: [...methodMap.values()],
          },
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 120000, maxWait: 10000 },
    );
  }

  async analytics(user: AuthenticatedUser, query: AdminReportQueryDto) {
    const s = await this.snapshot(user, query);
    return {
      scope: {
        dateFrom: s.dateFrom,
        dateTo: s.dateTo,
        branchId: s.branchId,
        branch: s.branch,
        interval: s.interval,
        timeZone: s.timeZone,
      },
      stats: {
        ...s.stats,
        totalRevenueChange: 'Collected on completed bills in selected period',
        totalBillsChange: 'Selected period, all bill statuses',
        totalCustomersChange: 'Current customers with bills in this scope',
        totalServicesChange: 'Current service catalogue',
        totalStaffChange: 'Current Admin, Manager and Staff accounts',
      },
      revenueSeries: s.revenueSeries,
      billsOverview: s.billsOverview,
      branchComparison: s.branchComparison,
      revenueByBranch: s.branchComparison.map((b) => ({
        id: b.id,
        branchName: b.name,
        revenue: b.revenue,
      })),
      topServicesByRevenue: [...s.services]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topServicesByQuantity: [...s.services]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
      branches: s.branches,
    };
  }

  private record(row: {
    id: string;
    name: string;
    createdAt: Date;
    snapshot: unknown;
  }) {
    const s = row.snapshot as AdminReportSnapshot;
    return {
      id: row.id,
      name: row.name,
      status: s.status,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      branch: s.branch,
      generatedBy: s.generatedBy,
      generatedOn: row.createdAt,
      fileName: adminReportFileName(s),
      format: 'xlsx',
    };
  }

  async generate(user: AuthenticatedUser, query: AdminReportQueryDto) {
    if (query.async) {
      return this.generateAsync(user, query);
    }
    const franchiseId = this.franchise(user);
    const snapshot = await measureBaseline('report:snapshot:ms', () =>
      this.snapshot(user, query),
    );
    const row = await this.prisma.platformReport.create({
      data: {
        name: 'Franchise Overview Report',
        type: 'FINANCIAL',
        format: 'EXCEL',
        franchiseId,
        generatedById: user.userId,
        dateFrom: parseDateOnlyUtc(snapshot.dateFrom),
        dateTo: parseDateOnlyUtc(snapshot.dateTo),
        snapshot: {
          ...snapshot,
          status: 'Generating',
        },
      },
    });
    try {
      await measureBaseline('report:workbook:ms', () =>
        buildAdminWorkbook(snapshot),
      );
      const ready = await this.prisma.platformReport.update({
        where: { id: row.id },
        data: { snapshot: snapshot },
      });
      return this.record(ready);
    } catch (error) {
      await this.prisma.platformReport.update({
        where: { id: row.id },
        data: {
          snapshot: {
            ...snapshot,
            status: 'Failed',
          },
        },
      });
      throw error;
    }
  }

  async generateAsync(user: AuthenticatedUser, query: AdminReportQueryDto) {
    const franchiseId = this.franchise(user);
    if (query.reportType && query.reportType !== 'overview')
      throw new BadRequestException('Only Overview reports are supported');
    const timeZone = await this.timezone.resolveForUser(user);
    const today = calendarDateInTimeZone(timeZone);
    const dateFrom = query.dateFrom ?? `${today.slice(0, 7)}-01`;
    const dateTo = query.dateTo ?? today;
    if (
      !isDateOnlyString(dateFrom) ||
      !isDateOnlyString(dateTo) ||
      dateFrom > dateTo
    )
      throw new BadRequestException('Choose a valid date range');
    if (
      parseDateOnlyUtc(dateTo).getTime() -
        parseDateOnlyUtc(dateFrom).getTime() >
      3660 * 86400000
    )
      throw new BadRequestException('Choose a range of ten years or less');
    const interval = query.interval ?? 'day';
    if (!['day', 'week', 'month'].includes(interval))
      throw new BadRequestException('Invalid reporting interval');

    const branches = await this.prisma.salon.findMany({
      where: { franchiseId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const selected = query.branchId
      ? branches.find((b) => b.id === query.branchId)
      : null;
    if (query.branchId && !selected)
      throw new ForbiddenException('Branch is outside your franchise');

    const initialSnapshot: AdminReportSnapshot = {
      kind: 'FRANCHISE_OVERVIEW',
      status: 'Generating',
      dateFrom,
      dateTo,
      branchId: query.branchId ?? null,
      branch: selected?.name ?? 'All Branches',
      timeZone,
      interval,
      generatedOn: new Date().toISOString(),
      generatedBy: user.email,
      stats: {
        totalRevenue: 0,
        totalBills: 0,
        totalCustomers: 0,
        totalServices: 0,
        totalStaff: 0,
      },
      bills: [],
      revenueSeries: [],
      branchComparison: [],
      customers: [],
      billsOverview: {
        total: 0,
        paid: 0,
        paidPct: 0,
        pending: 0,
        pendingPct: 0,
        overdue: 0,
        overduePct: 0,
        cancelled: 0,
        cancelledPct: 0,
      },
      services: [],
      branches,
      payments: {
        successful: 0,
        failed: 0,
        attempts: 0,
        successRate: null,
        methods: [],
      },
    };

    const row = await this.prisma.platformReport.create({
      data: {
        name: 'Franchise Overview Report',
        type: 'FINANCIAL',
        format: 'EXCEL',
        franchiseId,
        generatedById: user.userId,
        dateFrom: parseDateOnlyUtc(dateFrom),
        dateTo: parseDateOnlyUtc(dateTo),
        snapshot: initialSnapshot as unknown as Prisma.InputJsonValue,
      },
    });

    if (this.reportQueue) {
      await this.reportQueue.add(
        REPORT_JOB_ADMIN_EXPORT,
        {
          reportId: row.id,
          actorUserId: user.userId,
          franchiseId,
          query: {
            dateFrom,
            dateTo,
            branchId: query.branchId,
            interval,
            reportType: query.reportType,
          },
        },
        {
          jobId: `admin-report-${row.id}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return this.record(row);
  }

  async processBackgroundAdminReport(
    payload: AdminReportJobPayload,
  ): Promise<void> {
    const report = await this.prisma.platformReport.findUnique({
      where: { id: payload.reportId },
      select: { id: true, snapshot: true },
    });
    if (!report) {
      this.logger.warn(
        `Admin report ${payload.reportId} not found for background generation`,
      );
      return;
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: payload.actorUserId },
      select: { id: true, email: true, franchiseId: true },
    });

    const authUser: AuthenticatedUser = {
      userId: payload.actorUserId,
      email: actor?.email ?? '',
      role: RoleCode.ADMIN,
      franchiseId: actor?.franchiseId ?? payload.franchiseId,
      salonId: null,
      sessionId: null,
    };

    try {
      const snapshot = await measureBaseline('report:snapshot:ms', () =>
        this.snapshot(authUser, payload.query),
      );
      await measureBaseline('report:workbook:ms', () =>
        buildAdminWorkbook(snapshot),
      );
      await this.prisma.platformReport.update({
        where: { id: payload.reportId },
        data: {
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate background admin report ${payload.reportId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      const current = report.snapshot as Record<string, unknown> | null;
      await this.prisma.platformReport.update({
        where: { id: payload.reportId },
        data: {
          snapshot: {
            ...(typeof current === 'object' && current !== null ? current : {}),
            status: 'Failed',
          } as unknown as Prisma.InputJsonValue,
        },
      });
      throw error;
    }
  }

  async history(user: AuthenticatedUser) {
    const franchiseId = this.franchise(user);
    const rows = await this.prisma.platformReport.findMany({
      where: {
        franchiseId,
        snapshot: { path: '$.kind', equals: 'FRANCHISE_OVERVIEW' },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        snapshot: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((row) => this.record(row));
  }

  async download(user: AuthenticatedUser, id: string) {
    const franchiseId = this.franchise(user);
    const row = await this.prisma.platformReport.findFirst({
      where: {
        id,
        franchiseId,
        snapshot: { path: '$.kind', equals: 'FRANCHISE_OVERVIEW' },
      },
      select: {
        snapshot: true,
      },
    });
    if (!row) throw new NotFoundException('Report not found');
    const snapshot = row.snapshot as unknown as AdminReportSnapshot;
    if (snapshot.status !== 'Ready')
      throw new BadRequestException('Report is not ready. Generate it again');
    return {
      body: await buildAdminWorkbook(snapshot),
      fileName: adminReportFileName(snapshot),
      contentType: XLSX_CONTENT_TYPE,
    };
  }
}
