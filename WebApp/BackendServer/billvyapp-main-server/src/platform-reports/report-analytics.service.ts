import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import {
  businessCalendarRangeToUtc,
  isDateOnlyString,
  parseDateOnlyUtc,
} from '../common/datetime/datetime';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ReportAnalyticsQueryDto } from './dto/report-analytics-query.dto';
import { franchiseRegion } from '../common/regional';

type Row = Record<string, string | number | null>;
type RawRow = Record<string, unknown>;
export type ReportSummary = {
  totalRevenue: string;
  successfulPayments: number;
  totalPayments: number;
  userCount: number;
  customerCount: number;
  franchiseCount: number;
  salonCount: number;
  failedPayments: number;
  paymentSuccessRate: number | null;
  averageTransactionValue: number | null;
};
export type ReportAnalytics = {
  currencyGroups?: ReportAnalytics[];
  scope: {
    dateFrom: string;
    dateTo: string;
    franchiseId: string | null;
    franchiseName: string | null;
    salonId: string | null;
    salonName: string | null;
    timeZone: string;
    currency?: string;
    dateFormat?: string;
  };
  summary?: ReportSummary;
  revenue?: {
    series: Row[];
    methods: Row[];
    statuses: Row[];
    daily?: Row[];
    salonMethods?: Row[];
  };
  business?: { franchises: Row[]; salons: Row[] };
  insights?: {
    customers: Row[];
    roles: Row[];
    userFranchises: Row[];
    userSalons: Row[];
  };
  details?: { memberships: Row[]; plans: Row[]; services: Row[] };
};

function rows(values: RawRow[]): Row[] {
  return values.map(
    (value) =>
      Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          v == null
            ? null
            : typeof v === 'bigint'
              ? Number(v)
              : typeof v === 'object' && 'toNumber' in v
                ? Number((v as { toNumber: () => number }).toNumber())
                : v,
        ]),
      ) as Row,
  );
}
export function reportBuckets(
  from: string,
  to: string,
  interval: string,
  timeZone: string,
  maxBuckets = 500,
) {
  const buckets: { label: string; from: Date; to: Date }[] = [];
  let cursor = parseDateOnlyUtc(from);
  const end = parseDateOnlyUtc(to);
  while (cursor <= end) {
    const next = new Date(cursor);
    if (interval === 'year')
      next.setUTCFullYear(next.getUTCFullYear() + 1, 0, 1);
    else if (interval === 'month') next.setUTCMonth(next.getUTCMonth() + 1, 1);
    else if (interval === 'week')
      next.setUTCDate(next.getUTCDate() + (8 - (next.getUTCDay() || 7)));
    else next.setUTCDate(next.getUTCDate() + 1);
    const until = new Date(Math.min(next.getTime() - 86400000, end.getTime()));
    const label = cursor.toISOString().slice(0, 10);
    const range = businessCalendarRangeToUtc(
      label,
      until.toISOString().slice(0, 10),
      timeZone,
    );
    buckets.push({ label, from: range.gte!, to: range.lt! });
    if (buckets.length > maxBuckets)
      throw new BadRequestException(
        'Choose Week, Month or Year for ranges with more than 500 chart periods',
      );
    cursor = next;
  }
  return buckets;
}

@Injectable()
export class ReportAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezone: BusinessTimezoneService,
  ) {}

  assertAccess(user: AuthenticatedUser) {
    if (user.role !== RoleCode.SUPER_ADMIN)
      throw new ForbiddenException(
        'Platform analytics require Super Admin access',
      );
  }

  async options(user: AuthenticatedUser, franchiseId?: string) {
    this.assertAccess(user);
    const [franchises, salons] = await Promise.all([
      this.prisma.franchise.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      this.prisma.salon.findMany({
        where: franchiseId ? { franchiseId } : {},
        select: { id: true, name: true, franchiseId: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
    ]);
    return { franchises, salons };
  }

  async query(
    user: AuthenticatedUser,
    q: ReportAnalyticsQueryDto,
    all = false,
    currencyGroup?: { currency: string; franchiseIds: string[] },
  ): Promise<ReportAnalytics> {
    this.assertAccess(user);
    if (
      !isDateOnlyString(q.dateFrom) ||
      !isDateOnlyString(q.dateTo) ||
      q.dateFrom > q.dateTo
    )
      throw new BadRequestException('Select a valid inclusive date range');
    if (
      (parseDateOnlyUtc(q.dateTo).getTime() -
        parseDateOnlyUtc(q.dateFrom).getTime()) /
        86400000 >
      3660
    )
      throw new BadRequestException('Select a range of ten years or less');
    let franchiseId = q.franchiseId ?? null;
    let salonName: string | null = null;
    if (q.salonId) {
      const salon = await this.prisma.salon.findUnique({
        where: { id: q.salonId },
        select: { name: true, franchiseId: true },
      });
      if (!salon || (franchiseId && salon.franchiseId !== franchiseId))
        throw new BadRequestException(
          'Salon does not belong to the selected franchise',
        );
      franchiseId = salon.franchiseId;
      salonName = salon.name;
    }
    const franchise = franchiseId
      ? await this.prisma.franchise.findUnique({
          where: { id: franchiseId },
          select: { name: true, preferences: true },
        })
      : null;
    if (franchiseId && !franchise)
      throw new BadRequestException('Franchise not found');
    const platformFranchises =
      !franchiseId && !currencyGroup
        ? await this.prisma.franchise.findMany({
            select: { id: true, preferences: true },
          })
        : [];
    const currencies = currencyGroup
      ? [currencyGroup.currency]
      : franchiseId
        ? [franchiseRegion(franchise?.preferences).currency]
        : [
            ...new Set(
              platformFranchises.map(
                (f) => franchiseRegion(f.preferences).currency,
              ),
            ),
          ];
    if (currencies.length > 1) {
      const currencyGroups: ReportAnalytics[] = [];
      for (const currency of currencies.sort()) {
        currencyGroups.push(
          await this.query(user, q, all, {
            currency,
            franchiseIds: platformFranchises
              .filter(
                (f) => franchiseRegion(f.preferences).currency === currency,
              )
              .map((f) => f.id),
          }),
        );
      }
      const scope = { ...currencyGroups[0].scope };
      delete scope.currency;
      return { scope, currencyGroups };
    }
    const currency = currencies[0] ?? 'INR';
    const timeZone = await this.timezone.resolveForUser({
      ...user,
      franchiseId,
    });
    const range = businessCalendarRangeToUtc(q.dateFrom, q.dateTo, timeZone);
    const currencyScope = currencyGroup
      ? Prisma.sql`AND s.franchiseId IN (${Prisma.join(currencyGroup.franchiseIds)})`
      : Prisma.empty;
    const scope = Prisma.sql` ${currencyScope} ${franchiseId ? Prisma.sql`AND s.franchiseId = ${franchiseId}` : Prisma.empty} ${q.salonId ? Prisma.sql`AND s.id = ${q.salonId}` : Prisma.empty}`;
    const paymentWhere = Prisma.sql`p.paymentDate >= ${range.gte!} AND p.paymentDate < ${range.lt!} ${scope}`;
    // billDate is a calendar-date sentinel, unlike paymentDate/createdAt instants.
    const billWhere = Prisma.sql`b.status = 'COMPLETED' AND b.billDate >= ${parseDateOnlyUtc(q.dateFrom)} AND b.billDate < ${new Date(parseDateOnlyUtc(q.dateTo).getTime() + 86400000)} ${scope}`;
    const asOf = { lt: range.lt! };
    const populationScope = {
      ...(franchiseId
        ? { franchiseId }
        : currencyGroup
          ? { franchiseId: { in: currencyGroup.franchiseIds } }
          : {}),
      ...(q.salonId ? { salonId: q.salonId } : {}),
    };
    const wanted = (section: string) =>
      all || (q.section ?? 'summary') === section;
    // Dashboard rankings stay bounded; persisted exports must include every group.
    const rankingLimit = all ? Prisma.empty : Prisma.sql`LIMIT 50`;
    const result: ReportAnalytics = {
      scope: {
        dateFormat: franchiseRegion(franchise?.preferences).dateFormat,
        currency,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        franchiseId,
        franchiseName: franchise?.name ?? null,
        salonId: q.salonId ?? null,
        salonName,
        timeZone,
      },
    };
    return this.prisma.$transaction(
      async (tx) => {
        const sqlRows = async (sql: Prisma.Sql) =>
          rows(await tx.$queryRaw<RawRow[]>(sql));
        if (wanted('summary')) {
          const [
            payments,
            userCount,
            customerCount,
            franchiseCount,
            salonCount,
          ] = await Promise.all([
            sqlRows(
              Prisma.sql`SELECT COALESCE(SUM(CASE WHEN p.status='SUCCESS' THEN p.amount ELSE 0 END),0) AS totalRevenue, COUNT(*) AS totalPayments, SUM(p.status='SUCCESS') AS successfulPayments, SUM(p.status='FAILED') AS failedPayments FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId WHERE ${paymentWhere}`,
            ),
            tx.user.count({ where: { ...populationScope, createdAt: asOf } }),
            tx.customer.count({
              where: { user: populationScope, createdAt: asOf },
            }),
            tx.franchise.count({
              where: {
                ...(franchiseId
                  ? { id: franchiseId }
                  : currencyGroup
                    ? { id: { in: currencyGroup.franchiseIds } }
                    : {}),
                createdAt: asOf,
              },
            }),
            tx.salon.count({
              where: {
                ...(franchiseId
                  ? { franchiseId }
                  : currencyGroup
                    ? { franchiseId: { in: currencyGroup.franchiseIds } }
                    : {}),
                ...(q.salonId ? { id: q.salonId } : {}),
                createdAt: asOf,
              },
            }),
          ]);
          const p = payments[0];
          const successfulPayments = Number(p.successfulPayments ?? 0),
            totalPayments = Number(p.totalPayments);
          result.summary = {
            totalRevenue: Number(p.totalRevenue).toFixed(2),
            successfulPayments,
            totalPayments,
            failedPayments: Number(p.failedPayments ?? 0),
            userCount,
            customerCount,
            franchiseCount,
            salonCount,
            paymentSuccessRate: totalPayments
              ? (successfulPayments / totalPayments) * 100
              : null,
            averageTransactionValue: successfulPayments
              ? Number(p.totalRevenue) / successfulPayments
              : null,
          };
        }
        if (wanted('revenue')) {
          const buckets = reportBuckets(
            q.dateFrom,
            q.dateTo,
            q.interval ?? 'month',
            timeZone,
            all ? 3661 : 500,
          );
          const bucketCase = Prisma.sql`CASE ${Prisma.join(
            buckets.map(
              (v) =>
                Prisma.sql`WHEN p.paymentDate >= ${v.from} AND p.paymentDate < ${v.to} THEN ${v.label}`,
            ),
            ' ',
          )} END`;
          const [series, methods, statuses] = await Promise.all([
            sqlRows(
              Prisma.sql`SELECT ${bucketCase} AS period, SUM(p.amount) AS revenue, COUNT(*) AS transactions, AVG(p.amount) AS averageTransaction FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId WHERE ${paymentWhere} AND p.status='SUCCESS' GROUP BY period ORDER BY period`,
            ),
            sqlRows(
              Prisma.sql`SELECT p.paymentMethod AS method, COUNT(*) AS attempts, SUM(p.status='SUCCESS') AS successful, SUM(CASE WHEN p.status='SUCCESS' THEN p.amount ELSE 0 END) AS revenue FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId WHERE ${paymentWhere} GROUP BY p.paymentMethod ORDER BY revenue DESC`,
            ),
            sqlRows(
              Prisma.sql`SELECT p.status AS status, COUNT(*) AS attempts, SUM(p.amount) AS amount FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId WHERE ${paymentWhere} GROUP BY p.status ORDER BY attempts DESC`,
            ),
          ]);
          result.revenue = { series, methods, statuses };
          if (all) {
            const days = reportBuckets(
              q.dateFrom,
              q.dateTo,
              'day',
              timeZone,
              3661,
            );
            const dayCase = Prisma.sql`CASE ${Prisma.join(
              days.map(
                (v) =>
                  Prisma.sql`WHEN p.paymentDate >= ${v.from} AND p.paymentDate < ${v.to} THEN ${v.label}`,
              ),
              ' ',
            )} END`;
            result.revenue.daily =
              q.interval === 'day'
                ? series
                : await sqlRows(
                    Prisma.sql`SELECT ${dayCase} AS period,SUM(p.amount) AS revenue,COUNT(*) AS transactions,AVG(p.amount) AS averageTransaction FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId WHERE ${paymentWhere} AND p.status='SUCCESS' GROUP BY period ORDER BY period`,
                  );
            result.revenue.salonMethods = await sqlRows(
              Prisma.sql`SELECT s.id AS salonId,s.name AS salon,f.id AS franchiseId,f.name AS franchise,p.paymentMethod AS method,COUNT(*) AS attempts,SUM(p.status='SUCCESS') AS successful,SUM(CASE WHEN p.status='SUCCESS' THEN p.amount ELSE 0 END) AS revenue FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId JOIN franchises f ON f.id=s.franchiseId WHERE ${paymentWhere} GROUP BY s.id,s.name,f.id,f.name,p.paymentMethod ORDER BY revenue DESC,s.id,p.paymentMethod`,
            );
          }
        }
        if (wanted('business')) {
          const order = {
            revenue: Prisma.sql`revenue`,
            transactions: Prisma.sql`transactions`,
            customers: Prisma.sql`customers`,
            averageBill: Prisma.sql`averageBill`,
          }[q.salonSort ?? 'revenue'];
          const [franchises, salons] = await Promise.all([
            sqlRows(
              Prisma.sql`SELECT f.id, f.name, (SELECT COUNT(DISTINCT cb.customerId) FROM bills cb JOIN salons cs ON cs.id=cb.salonId WHERE cs.franchiseId=f.id AND cb.status='COMPLETED' AND cb.billDate >= ${parseDateOnlyUtc(q.dateFrom)} AND cb.billDate < ${new Date(parseDateOnlyUtc(q.dateTo).getTime() + 86400000)} ${q.salonId ? Prisma.sql`AND cs.id=${q.salonId}` : Prisma.empty}) AS customers, (SELECT COUNT(*) FROM salons x WHERE x.franchiseId=f.id AND x.createdAt < ${range.lt!} ${q.salonId ? Prisma.sql`AND x.id=${q.salonId}` : Prisma.empty}) AS salons, COUNT(*) AS transactions, SUM(p.amount) AS revenue, AVG(p.amount) AS averageTransaction FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId JOIN franchises f ON f.id=s.franchiseId WHERE ${paymentWhere} AND p.status='SUCCESS' GROUP BY f.id,f.name ORDER BY revenue DESC,f.id ${rankingLimit}`,
            ),
            sqlRows(Prisma.sql`WITH payment_stats AS (
              SELECT s.id AS salonId,COUNT(*) AS transactions,SUM(p.amount) AS revenue,AVG(p.amount) AS averageTransaction
              FROM payments p JOIN bills b ON b.id=p.billId JOIN salons s ON s.id=b.salonId WHERE ${paymentWhere} AND p.status='SUCCESS' GROUP BY s.id
            ), bill_stats AS (
              SELECT s.id AS salonId,COUNT(*) AS bills,COUNT(DISTINCT b.customerId) AS customers,AVG(b.total) AS averageBill
              FROM bills b JOIN salons s ON s.id=b.salonId WHERE ${billWhere} GROUP BY s.id
            ), member_stats AS (
              SELECT s.id AS salonId,COUNT(*) AS memberships FROM memberships m JOIN membership_plans mp ON mp.id=m.membershipPlanId JOIN salons s ON s.id=mp.salonId
              WHERE m.createdAt >= ${range.gte!} AND m.createdAt < ${range.lt!} ${scope} GROUP BY s.id
            ), service_stats AS (
              SELECT s.id AS salonId,SUM(i.quantity) AS servicesSold FROM bill_items i JOIN bills b ON b.id=i.billId JOIN salons s ON s.id=b.salonId
              WHERE ${billWhere} AND i.itemType='SERVICE' GROUP BY s.id
            ) SELECT s.id,s.name,f.id AS franchiseId,f.name AS franchise,COALESCE(ps.transactions,0) AS transactions,COALESCE(ps.revenue,0) AS revenue,ps.averageTransaction,
              COALESCE(bs.customers,0) AS customers,bs.averageBill,COALESCE(ms.memberships,0) AS memberships,COALESCE(ss.servicesSold,0) AS servicesSold
              FROM salons s JOIN franchises f ON f.id=s.franchiseId LEFT JOIN payment_stats ps ON ps.salonId=s.id LEFT JOIN bill_stats bs ON bs.salonId=s.id
              LEFT JOIN member_stats ms ON ms.salonId=s.id LEFT JOIN service_stats ss ON ss.salonId=s.id
              WHERE (ps.salonId IS NOT NULL OR bs.salonId IS NOT NULL OR ms.salonId IS NOT NULL) ${scope} ORDER BY ${order} DESC,s.id ${rankingLimit}`),
          ]);
          result.business = { franchises, salons };
        }
        if (wanted('insights')) {
          const userScope = Prisma.sql`${currencyGroup ? Prisma.sql`AND u.franchiseId IN (${Prisma.join(currencyGroup.franchiseIds)})` : Prisma.empty} ${franchiseId ? Prisma.sql`AND u.franchiseId=${franchiseId}` : Prisma.empty} ${q.salonId ? Prisma.sql`AND u.salonId=${q.salonId}` : Prisma.empty}`;
          const [customers, roles, userFranchises, userSalons] =
            await Promise.all([
              sqlRows(
                Prisma.sql`SELECT COUNT(DISTINCT b.customerId) AS customersServed, COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM bills old JOIN salons os ON os.id=old.salonId WHERE old.customerId=b.customerId AND old.status='COMPLETED' AND old.billDate < ${parseDateOnlyUtc(q.dateFrom)} ${currencyGroup ? Prisma.sql`AND os.franchiseId IN (${Prisma.join(currencyGroup.franchiseIds)})` : Prisma.empty} ${franchiseId ? Prisma.sql`AND os.franchiseId=${franchiseId}` : Prisma.empty} ${q.salonId ? Prisma.sql`AND os.id=${q.salonId}` : Prisma.empty}) THEN b.customerId END) AS returningCustomers, SUM(b.total) AS billedRevenue, SUM(b.total)/NULLIF(COUNT(DISTINCT b.customerId),0) AS averageCustomerSpend FROM bills b JOIN salons s ON s.id=b.salonId WHERE ${billWhere}`,
              ),
              sqlRows(
                Prisma.sql`SELECT r.code AS role,COUNT(*) AS users FROM users u JOIN roles r ON r.id=u.roleId WHERE u.createdAt < ${range.lt!} ${userScope} GROUP BY r.code ORDER BY users DESC`,
              ),
              sqlRows(
                Prisma.sql`SELECT COALESCE(f.name,'Platform') AS franchise,COUNT(*) AS users FROM users u LEFT JOIN franchises f ON f.id=u.franchiseId WHERE u.createdAt < ${range.lt!} ${userScope} GROUP BY f.id,f.name ORDER BY users DESC ${rankingLimit}`,
              ),
              sqlRows(
                Prisma.sql`SELECT COALESCE(s.name,'Unassigned') AS salon,COUNT(*) AS users FROM users u LEFT JOIN salons s ON s.id=u.salonId WHERE u.createdAt < ${range.lt!} ${userScope} GROUP BY s.id,s.name ORDER BY users DESC ${rankingLimit}`,
              ),
            ]);
          const newCustomers = await tx.customer.count({
            where: {
              user: populationScope,
              createdAt: { gte: range.gte, lt: range.lt },
            },
          });
          result.insights = {
            customers: [{ ...customers[0], newCustomers }],
            roles,
            userFranchises,
            userSalons,
          };
        }
        if (wanted('details')) {
          const memberScope = Prisma.sql`JOIN membership_plans mp ON mp.id=m.membershipPlanId JOIN salons s ON s.id=mp.salonId`;
          const [memberships, plans, services, fees, redemptions] =
            await Promise.all([
              sqlRows(
                Prisma.sql`SELECT COUNT(*) AS members, SUM(m.createdAt >= ${range.gte!}) AS newMemberships, SUM(m.status='ACTIVE' AND m.startDate <= ${parseDateOnlyUtc(q.dateTo)} AND m.endDate >= ${parseDateOnlyUtc(q.dateTo)}) AS activeMemberships, SUM(m.status IN ('ACTIVE','EXPIRED') AND m.endDate >= ${new Date(parseDateOnlyUtc(q.dateFrom).getTime() - 86400000)} AND m.endDate < ${parseDateOnlyUtc(q.dateTo)}) AS expiredMemberships FROM memberships m ${memberScope} WHERE m.createdAt < ${range.lt!} ${scope}`,
              ),
              sqlRows(Prisma.sql`WITH member_stats AS (
            SELECT m.membershipPlanId,COUNT(*) AS members,SUM(m.status='ACTIVE' AND m.startDate <= ${parseDateOnlyUtc(q.dateTo)} AND m.endDate >= ${parseDateOnlyUtc(q.dateTo)}) AS activeMembers FROM memberships m ${memberScope} WHERE m.createdAt < ${range.lt!} ${scope} GROUP BY m.membershipPlanId
          ), fee_stats AS (
            SELECT b.enrollmentPlanId AS planId,SUM(b.membershipFee) AS revenue FROM bills b JOIN salons s ON s.id=b.salonId WHERE ${billWhere} AND b.enrollmentPlanId IS NOT NULL GROUP BY b.enrollmentPlanId
          ), redemption_stats AS (
            SELECT r.membershipPlanId,COUNT(*) AS redemptions FROM membership_redemptions r JOIN bills rb ON rb.id=r.billId JOIN salons s ON s.id=r.salonId WHERE rb.status='COMPLETED' AND r.redeemedAt >= ${range.gte!} AND r.redeemedAt < ${range.lt!} ${scope} GROUP BY r.membershipPlanId
          ) SELECT mp.id,mp.name,s.id AS salonId,s.name AS salon,f.id AS franchiseId,f.name AS franchise,COALESCE(ms.members,0) AS members,COALESCE(ms.activeMembers,0) AS activeMembers,COALESCE(fs.revenue,0) AS revenue,COALESCE(rs.redemptions,0) AS redemptions
          FROM membership_plans mp JOIN salons s ON s.id=mp.salonId JOIN franchises f ON f.id=s.franchiseId LEFT JOIN member_stats ms ON ms.membershipPlanId=mp.id LEFT JOIN fee_stats fs ON fs.planId=mp.id LEFT JOIN redemption_stats rs ON rs.membershipPlanId=mp.id
          WHERE (ms.membershipPlanId IS NOT NULL OR fs.planId IS NOT NULL OR rs.membershipPlanId IS NOT NULL) ${scope} ORDER BY members DESC,mp.id ${rankingLimit}`),
              sqlRows(
                Prisma.sql`SELECT COALESCE(sv.id,i.id) AS id,COALESCE(sv.name,i.description) AS name,s.id AS salonId,s.name AS salon,f.id AS franchiseId,f.name AS franchise,COUNT(DISTINCT b.id) AS transactions,SUM(i.quantity) AS quantity,SUM(i.total) AS revenue,SUM(i.total)/NULLIF(SUM(i.quantity),0) AS averagePrice FROM bill_items i JOIN bills b ON b.id=i.billId JOIN salons s ON s.id=b.salonId LEFT JOIN services sv ON sv.id=i.serviceId JOIN franchises f ON f.id=s.franchiseId WHERE ${billWhere} AND i.itemType='SERVICE' GROUP BY COALESCE(sv.id,i.id),COALESCE(sv.name,i.description),s.id,s.name,f.id,f.name ORDER BY ${{ revenue: Prisma.sql`revenue`, quantity: Prisma.sql`quantity`, transactions: Prisma.sql`transactions` }[q.serviceSort ?? 'revenue']} DESC,id ${rankingLimit}`,
              ),
              sqlRows(
                Prisma.sql`SELECT SUM(b.membershipFee) AS membershipRevenue FROM bills b JOIN salons s ON s.id=b.salonId WHERE ${billWhere}`,
              ),
              sqlRows(
                Prisma.sql`SELECT COUNT(*) AS redemptions,COUNT(DISTINCT r.billId) AS benefitVisits,SUM(r.quantity) AS benefitUnits,SUM(r.discountAmount) AS benefitSavings FROM membership_redemptions r JOIN bills b ON b.id=r.billId JOIN salons s ON s.id=r.salonId WHERE r.redeemedAt >= ${range.gte!} AND r.redeemedAt < ${range.lt!} AND b.status='COMPLETED' ${scope}`,
              ),
            ]);
          result.details = {
            memberships: [{ ...memberships[0], ...fees[0], ...redemptions[0] }],
            plans,
            services,
          };
        }
        return result;
      },
      { isolationLevel: 'RepeatableRead', timeout: 30000 },
    );
  }
}
