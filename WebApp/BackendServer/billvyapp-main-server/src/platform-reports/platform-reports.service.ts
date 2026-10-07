import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RoleCode } from '../common/enums/role.enum';
import {
  REPORT_QUEUE,
  REPORT_JOB_PLATFORM_EXPORT,
  PlatformReportJobPayload,
} from './report.constants';
import { AuditService } from '../audit/audit.service';
import { ReportAnalyticsService } from './report-analytics.service';
import type { RequestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
} from '../common/pagination/pagination';
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import {
  businessCalendarRangeToUtc,
  formatDateOnlyUtc,
  isDateOnlyString,
  parseDateOnlyUtc,
} from '../common/datetime/datetime';
import type {
  PlatformReportFormat,
  PlatformReportType,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GeneratePlatformReportDto,
  type PlatformReportFormatApi,
  type PlatformReportTypeApi,
} from './dto/generate-platform-report.dto';
import { ListPlatformReportsQueryDto } from './dto/list-platform-reports-query.dto';
import { buildPlatformWorkbook } from './platform-report-workbook';
import { XLSX_CONTENT_TYPE } from './admin-report-workbook';

const REPORT_SELECT = {
  id: true,
  name: true,
  description: true,
  type: true,
  format: true,
  dateFrom: true,
  dateTo: true,
  franchiseId: true,
  generatedById: true,
  snapshot: true,
  createdAt: true,
  updatedAt: true,
  generatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  franchise: { select: { id: true, name: true } },
} as const;

type ReportRow = {
  id: string;
  name: string;
  description: string | null;
  type: PlatformReportType;
  format: PlatformReportFormat;
  dateFrom: Date;
  dateTo: Date;
  franchiseId: string | null;
  generatedById: string;
  snapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
  generatedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  franchise: { id: string; name: string } | null;
};

export type PlatformReportRecord = {
  id: string;
  name: string;
  description: string | null;
  type: PlatformReportTypeApi;
  typeLabel: string;
  format: PlatformReportFormatApi;
  dateFrom: string;
  dateTo: string;
  dateRangeLabel: string;
  franchiseId: string | null;
  franchiseName: string | null;
  generatedById: string;
  generatedBy: string;
  generatedOn: Date;
  snapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformReportsListResult = {
  data: PlatformReportRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    byType: Array<{ type: PlatformReportTypeApi; count: number }>;
  };
};

export type PlatformReportDownload = {
  fileName: string;
  contentType: string;
  body: Buffer;
};

const TYPE_TO_API: Record<PlatformReportType, PlatformReportTypeApi> = {
  FINANCIAL: 'financial',
  BUSINESS: 'business',
  USER: 'user',
  TRANSACTION: 'transaction',
  SUBSCRIPTION: 'subscription',
  ACTIVITY: 'activity',
};

const TYPE_TO_DB: Record<PlatformReportTypeApi, PlatformReportType> = {
  financial: 'FINANCIAL',
  business: 'BUSINESS',
  user: 'USER',
  transaction: 'TRANSACTION',
  subscription: 'SUBSCRIPTION',
  activity: 'ACTIVITY',
};

const FORMAT_TO_API: Record<PlatformReportFormat, PlatformReportFormatApi> = {
  PDF: 'pdf',
  EXCEL: 'excel',
};

const FORMAT_TO_DB: Record<PlatformReportFormatApi, PlatformReportFormat> = {
  pdf: 'PDF',
  excel: 'EXCEL',
};

const TYPE_LABELS: Record<PlatformReportTypeApi, string> = {
  financial: 'Financial',
  business: 'Business',
  user: 'User',
  transaction: 'Transaction',
  subscription: 'Subscription',
  activity: 'Activity',
};

const ALL_TYPES = Object.keys(TYPE_TO_DB) as PlatformReportTypeApi[];

@Injectable()
export class PlatformReportsService {
  private readonly logger = new Logger(PlatformReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly businessTimezone: BusinessTimezoneService,
    private readonly analytics: ReportAnalyticsService,
    @Optional()
    @InjectQueue(REPORT_QUEUE)
    private readonly reportQueue?: Queue<PlatformReportJobPayload>,
  ) {}

  private assertAccess(user: AuthenticatedUser) {
    if (user.role !== RoleCode.SUPER_ADMIN)
      throw new ForbiddenException(
        'Platform reports require Super Admin access',
      );
  }

  async list(
    user: AuthenticatedUser,
    query: ListPlatformReportsQueryDto,
  ): Promise<PlatformReportsListResult> {
    this.assertAccess(user);
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const timeZone = await this.businessTimezone.resolveForUser(user);
    const where = this.buildListWhere(query, timeZone);

    const [rows, grouped] = await Promise.all([
      this.prisma.platformReport.findMany({
        where,
        select: REPORT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.platformReport.groupBy({
        by: ['type'],
        where,
        _count: { _all: true },
        orderBy: { type: 'asc' },
      }),
    ]);

    const byTypeMap = new Map<PlatformReportTypeApi, number>();
    let total = 0;
    for (const type of ALL_TYPES) byTypeMap.set(type, 0);
    for (const row of grouped) {
      const count =
        typeof row._count === 'object' && row._count && '_all' in row._count
          ? Number(row._count._all)
          : 0;
      byTypeMap.set(TYPE_TO_API[row.type], count);
      total += count;
    }

    const pageResult = paginated(
      rows.map((row) => this.toRecord(row)),
      total,
      page,
      limit,
    );

    return {
      ...pageResult,
      summary: {
        total,
        byType: ALL_TYPES.map((type) => ({
          type,
          count: byTypeMap.get(type) ?? 0,
        })),
      },
    };
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<PlatformReportRecord> {
    this.assertAccess(user);
    const row = await this.prisma.platformReport.findUnique({
      where: { id },
      select: REPORT_SELECT,
    });
    if (!row) throw new NotFoundException('Platform report not found');
    return this.toRecord(row);
  }

  async generate(
    user: AuthenticatedUser,
    dto: GeneratePlatformReportDto,
    ctx: RequestContext,
  ): Promise<PlatformReportRecord> {
    this.assertAccess(user);
    if (dto.async) {
      return this.generateAsync(user, dto, ctx);
    }
    if (!isDateOnlyString(dto.dateFrom) || !isDateOnlyString(dto.dateTo)) {
      throw new BadRequestException('dateFrom/dateTo must be YYYY-MM-DD');
    }
    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }

    // DATE columns store the calendar labels themselves (no zone).
    const dateFrom = parseDateOnlyUtc(dto.dateFrom);
    const dateTo = parseDateOnlyUtc(dto.dateTo);

    if (dto.format === 'pdf')
      throw new BadRequestException(
        'PDF generation is not implemented. Use Excel (.xlsx).',
      );
    const analytics = await this.analytics.query(user, dto, true);
    const metrics = analytics.summary;
    const franchiseName = analytics.scope.franchiseName;
    const type = dto.type;
    const format = dto.format ?? 'excel';
    const dateRangeLabel = this.formatDateRangeLabel(dateFrom, dateTo);
    const name = `${TYPE_LABELS[type]} Report — ${dto.dateFrom} to ${dto.dateTo}`;
    const description = franchiseName
      ? `${TYPE_LABELS[type]} snapshot for ${franchiseName} (${dateRangeLabel})`
      : `${TYPE_LABELS[type]} platform snapshot (${dateRangeLabel})`;

    const snapshot: Record<string, unknown> = {
      status: 'Ready',
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      timeZone: analytics.scope.timeZone,
      franchiseId: analytics.scope.franchiseId,
      franchiseName,
      salonId: analytics.scope.salonId,
      salonName: analytics.scope.salonName,
      interval: dto.interval ?? 'month',
      salonSort: dto.salonSort ?? 'revenue',
      serviceSort: dto.serviceSort ?? 'revenue',
      ...(metrics ? { metrics } : {}),
      analytics,
    };

    // Verify XLSX generation before marking the persisted snapshot ready.
    await buildPlatformWorkbook({
      name,
      typeLabel: TYPE_LABELS[type],
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      generatedOn: new Date(),
      generatedBy: user.email,
      franchiseName,
      snapshot,
    } as PlatformReportRecord);
    const created = await this.prisma.platformReport.create({
      data: {
        name,
        description,
        type: TYPE_TO_DB[type],
        format: FORMAT_TO_DB[format],
        dateFrom,
        dateTo,
        franchiseId: analytics.scope.franchiseId,
        generatedById: user.userId,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
      select: REPORT_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      action: 'PLATFORM_REPORT_GENERATED',
      entityType: 'PlatformReport',
      entityId: created.id,
      newData: {
        type,
        format,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        franchiseId: analytics.scope.franchiseId,
        salonId: analytics.scope.salonId,
        interval: dto.interval ?? 'month',
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toRecord(created);
  }

  async generateAsync(
    user: AuthenticatedUser,
    dto: GeneratePlatformReportDto,
    ctx: RequestContext,
  ): Promise<PlatformReportRecord> {
    this.assertAccess(user);
    if (!isDateOnlyString(dto.dateFrom) || !isDateOnlyString(dto.dateTo)) {
      throw new BadRequestException('dateFrom/dateTo must be YYYY-MM-DD');
    }
    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }

    const dateFrom = parseDateOnlyUtc(dto.dateFrom);
    const dateTo = parseDateOnlyUtc(dto.dateTo);

    if (dto.format === 'pdf')
      throw new BadRequestException(
        'PDF generation is not implemented. Use Excel (.xlsx).',
      );

    await this.analytics.query(user, dto); // Validate filters before persisting/queueing.
    const type = dto.type;
    const format = dto.format ?? 'excel';
    const dateRangeLabel = this.formatDateRangeLabel(dateFrom, dateTo);
    const name = `${TYPE_LABELS[type]} Report — ${dto.dateFrom} to ${dto.dateTo}`;
    const description = `${TYPE_LABELS[type]} platform snapshot (${dateRangeLabel})`;

    const initialSnapshot: Record<string, unknown> = {
      status: 'Generating',
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      franchiseId: dto.franchiseId ?? null,
      salonId: dto.salonId ?? null,
      interval: dto.interval ?? 'month',
      salonSort: dto.salonSort ?? 'revenue',
      serviceSort: dto.serviceSort ?? 'revenue',
    };

    const created = await this.prisma.platformReport.create({
      data: {
        name,
        description,
        type: TYPE_TO_DB[type],
        format: FORMAT_TO_DB[format],
        dateFrom,
        dateTo,
        franchiseId: dto.franchiseId,
        generatedById: user.userId,
        snapshot: initialSnapshot as Prisma.InputJsonValue,
      },
      select: REPORT_SELECT,
    });

    if (this.reportQueue) {
      await this.reportQueue.add(
        REPORT_JOB_PLATFORM_EXPORT,
        {
          reportId: created.id,
          actorUserId: user.userId,
          dto: {
            type: dto.type,
            format: dto.format,
            dateFrom: dto.dateFrom,
            dateTo: dto.dateTo,
            franchiseId: dto.franchiseId,
            salonId: dto.salonId,
            interval: dto.interval,
            salonSort: dto.salonSort,
            serviceSort: dto.serviceSort,
          },
        },
        {
          jobId: `platform-report-${created.id}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    await this.audit.record({
      userId: user.userId,
      action: 'PLATFORM_REPORT_GENERATED',
      entityType: 'PlatformReport',
      entityId: created.id,
      newData: {
        type,
        format,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        franchiseId: dto.franchiseId,
        salonId: dto.salonId,
        interval: dto.interval ?? 'month',
        async: true,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toRecord(created);
  }

  async processBackgroundPlatformReport(
    payload: PlatformReportJobPayload,
  ): Promise<void> {
    const report = await this.prisma.platformReport.findUnique({
      where: { id: payload.reportId },
      select: { id: true, snapshot: true },
    });
    if (!report) {
      this.logger.warn(
        `Platform report ${payload.reportId} not found in background processing`,
      );
      return;
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: payload.actorUserId },
      select: {
        email: true,
        franchiseId: true,
        salonId: true,
        role: { select: { code: true } },
      },
    });

    const authUser: AuthenticatedUser = {
      userId: payload.actorUserId,
      email: actor?.email ?? '',
      role: actor?.role?.code as RoleCode,
      franchiseId: actor?.franchiseId ?? null,
      salonId: actor?.salonId ?? null,
      sessionId: null,
    };

    try {
      this.assertAccess(authUser);
      const dto = payload.dto as GeneratePlatformReportDto;
      const analytics = await this.analytics.query(authUser, dto, true);
      const metrics = analytics.summary;
      const franchiseName = analytics.scope.franchiseName;
      const dateRangeLabel = this.formatDateRangeLabel(
        parseDateOnlyUtc(dto.dateFrom),
        parseDateOnlyUtc(dto.dateTo),
      );
      const description = franchiseName
        ? `${TYPE_LABELS[dto.type]} snapshot for ${franchiseName} (${dateRangeLabel})`
        : `${TYPE_LABELS[dto.type]} platform snapshot (${dateRangeLabel})`;

      const snapshot: Record<string, unknown> = {
        status: 'Ready',
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        timeZone: analytics.scope.timeZone,
        franchiseId: analytics.scope.franchiseId,
        franchiseName,
        salonId: analytics.scope.salonId,
        salonName: analytics.scope.salonName,
        interval: dto.interval ?? 'month',
        salonSort: dto.salonSort ?? 'revenue',
        serviceSort: dto.serviceSort ?? 'revenue',
        ...(metrics ? { metrics } : {}),
        analytics,
      };

      await buildPlatformWorkbook({
        name: `${TYPE_LABELS[dto.type]} Report — ${dto.dateFrom} to ${dto.dateTo}`,
        typeLabel: TYPE_LABELS[dto.type],
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        generatedOn: new Date(),
        generatedBy: authUser.email,
        franchiseName,
        snapshot,
      } as PlatformReportRecord);
      await this.prisma.platformReport.update({
        where: { id: payload.reportId },
        data: {
          description,
          snapshot: snapshot as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate background platform report ${payload.reportId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      const current = (report.snapshot as Record<string, unknown>) ?? {};
      await this.prisma.platformReport.update({
        where: { id: payload.reportId },
        data: {
          snapshot: {
            ...current,
            status: 'Failed',
          },
        },
      });
      throw error;
    }
  }

  async download(
    user: AuthenticatedUser,
    id: string,
  ): Promise<PlatformReportDownload> {
    this.assertAccess(user);
    const row = await this.prisma.platformReport.findUnique({
      where: { id },
      select: REPORT_SELECT,
    });
    if (!row) throw new NotFoundException('Platform report not found');

    const record = this.toRecord(row);
    if (record.snapshot && record.snapshot.status === 'Generating') {
      throw new BadRequestException(
        'Report is still generating. Please try again shortly',
      );
    }
    if (record.snapshot && record.snapshot.status === 'Failed') {
      throw new BadRequestException(
        'Report generation failed. Please regenerate',
      );
    }
    const body = await buildPlatformWorkbook(record);
    return {
      fileName: `${record.typeLabel}_Report_${record.dateFrom}_to_${record.dateTo}.xlsx`,
      contentType: XLSX_CONTENT_TYPE,
      body,
    };
  }

  async remove(
    user: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<{ id: string }> {
    this.assertAccess(user);
    const existing = await this.prisma.platformReport.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
    if (!existing) throw new NotFoundException('Platform report not found');

    await this.prisma.platformReport.delete({ where: { id } });

    await this.audit.record({
      userId: user.userId,
      action: 'PLATFORM_REPORT_DELETED',
      entityType: 'PlatformReport',
      entityId: id,
      oldData: { type: TYPE_TO_API[existing.type] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id };
  }

  private buildListWhere(
    query: ListPlatformReportsQueryDto,
    timeZone: string,
  ): Prisma.PlatformReportWhereInput {
    const search = query.search?.trim();
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.dateFrom || query.dateTo) {
      try {
        const range = businessCalendarRangeToUtc(
          query.dateFrom,
          query.dateTo,
          timeZone,
        );
        if (range.gte) createdAt.gte = range.gte;
        if (range.lt) createdAt.lt = range.lt;
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid date range',
        );
      }
    }

    return {
      ...(query.type ? { type: TYPE_TO_DB[query.type] } : {}),
      ...(query.franchiseId ? { franchiseId: query.franchiseId } : {}),
      ...(query.salonId
        ? { snapshot: { path: '$.salonId', equals: query.salonId } }
        : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };
  }

  private toRecord(row: ReportRow): PlatformReportRecord {
    const type = TYPE_TO_API[row.type];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type,
      typeLabel: TYPE_LABELS[type],
      format: FORMAT_TO_API[row.format],
      dateFrom: this.toDateOnly(row.dateFrom),
      dateTo: this.toDateOnly(row.dateTo),
      dateRangeLabel: this.formatDateRangeLabel(row.dateFrom, row.dateTo),
      franchiseId: row.franchiseId,
      franchiseName:
        (row.snapshot &&
        typeof row.snapshot === 'object' &&
        'franchiseName' in row.snapshot
          ? (row.snapshot.franchiseName as string | null)
          : row.franchise?.name) ?? null,
      generatedById: row.generatedById,
      generatedBy:
        `${row.generatedBy.firstName} ${row.generatedBy.lastName}`.trim(),
      generatedOn: row.createdAt,
      snapshot:
        row.snapshot && typeof row.snapshot === 'object'
          ? (row.snapshot as Record<string, unknown>)
          : {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private parseDateOnly(value: string): Date {
    try {
      return parseDateOnlyUtc(value);
    } catch {
      throw new BadRequestException('Invalid date; expected YYYY-MM-DD');
    }
  }

  private toDateOnly(value: Date): string {
    // DATE_ONLY sentinel / UTC-midnight calendar label
    return formatDateOnlyUtc(value);
  }

  private formatDateRangeLabel(from: Date, to: Date): string {
    const fmt = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `${fmt.format(from)} – ${fmt.format(to)}`;
  }
}
