jest.mock('../generated/prisma/client', () => {
  const runtime = jest.requireActual<
    typeof import('@prisma/client/runtime/client')
  >('@prisma/client/runtime/client');
  return {
    Prisma: { sql: runtime.sqltag, join: runtime.join, empty: runtime.empty },
  };
});
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class WorkerHost {},
}));
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ReportAnalyticsService,
  reportBuckets,
} from './report-analytics.service';
import { RoleCode } from '../common/enums/role.enum';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { PlatformReportsController } from './platform-reports.controller';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
const actor: AuthenticatedUser = {
  userId: 'sa',
  email: 'sa@example.test',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: null,
};
const query = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-04',
  franchiseId: 'f',
  salonId: 's',
};
describe('Reporting aggregates', () => {
  const raw = jest.fn<
    Promise<Record<string, unknown>[]>,
    [{ sql: string; values: unknown[] }]
  >();
  const tx = {
    $queryRaw: raw,
    user: { count: jest.fn() },
    customer: { count: jest.fn() },
    franchise: { count: jest.fn() },
    salon: { count: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(),
    franchise: { ...tx.franchise, findUnique: jest.fn(), findMany: jest.fn() },
    salon: { ...tx.salon, findUnique: jest.fn(), findMany: jest.fn() },
  };
  const timezone = {
    resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
  };
  let service: ReportAnalyticsService;
  beforeEach(() => {
    jest.clearAllMocks();
    raw.mockResolvedValue([
      {
        totalRevenue: '1500.00',
        totalPayments: 4n,
        successfulPayments: 3n,
        failedPayments: 1n,
      },
    ]);
    for (const model of [tx.user, tx.customer, tx.franchise, tx.salon])
      model.count.mockResolvedValue(2);
    prisma.franchise.findUnique.mockResolvedValue({ name: 'Franchise' });
    prisma.salon.findUnique.mockResolvedValue({
      name: 'Salon',
      franchiseId: 'f',
    });
    prisma.$transaction.mockImplementation(
      (run: (client: typeof tx) => unknown) => run(tx),
    );
    service = new ReportAnalyticsService(prisma as never, timezone as never);
  });
  it.each([
    RoleCode.ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  ])('rejects %s at the service boundary', async (role) => {
    await expect(
      service.query({ ...actor, role }, query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.options({ ...actor, role })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(raw).not.toHaveBeenCalled();
  });
  it('retains Super Admin-only controller authorization', () =>
    expect(Reflect.getMetadata(ROLES_KEY, PlatformReportsController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]));
  it('uses successful payment revenue, all attempts and zero-safe ratios', async () => {
    const result = await service.query(actor, query);
    expect(result.summary).toMatchObject({
      totalRevenue: '1500.00',
      successfulPayments: 3,
      totalPayments: 4,
      failedPayments: 1,
      paymentSuccessRate: 75,
      averageTransactionValue: 500,
    });
    expect(result.scope).toMatchObject({ franchiseId: 'f', salonId: 's' });
    const sql = raw.mock.calls[0][0];
    expect(sql.sql).toContain("p.status='SUCCESS'");
    expect(sql.sql).not.toContain('LIMIT 100');
    expect(sql.values).toContain('f');
    expect(sql.values).toContain('s');
    expect(sql.values).toContainEqual(new Date('2026-09-30T18:30:00Z'));
    expect(sql.values).toContainEqual(new Date('2026-10-04T18:30:00Z'));
    expect(tx.user.count).toHaveBeenCalledWith({
      where: {
        franchiseId: 'f',
        salonId: 's',
        createdAt: { lt: new Date('2026-10-04T18:30:00Z') },
      },
    });
  });

  it('identifies the selected franchise currency', async () => {
    prisma.franchise.findUnique.mockResolvedValue({
      name: 'US Franchise',
      preferences: { currency: 'USD' },
    });
    expect((await service.query(actor, query)).scope.currency).toBe('USD');
    expect(timezone.resolveForUser).toHaveBeenCalledWith(
      expect.objectContaining({ franchiseId: 'f' }),
    );
  });
  it('keeps all-franchise INR and USD totals separate and scopes every aggregate', async () => {
    prisma.franchise.findMany.mockResolvedValue([
      { id: 'india', preferences: { currency: 'INR' } },
      { id: 'us', preferences: { currency: 'USD' } },
    ]);
    raw.mockImplementation((sql) =>
      Promise.resolve([
        {
          totalRevenue: sql.values.includes('india') ? '1500' : '25',
          totalPayments: 1,
          successfulPayments: 1,
          failedPayments: 0,
        },
      ]),
    );
    const result = await service.query(
      actor,
      { dateFrom: query.dateFrom, dateTo: query.dateTo },
      true,
    );
    expect(result.summary).toBeUndefined();
    expect(result.scope.currency).toBeUndefined();
    expect(
      result.currencyGroups?.map((g) => [
        g.scope.currency,
        g.summary?.totalRevenue,
      ]),
    ).toEqual([
      ['INR', '1500.00'],
      ['USD', '25.00'],
    ]);
    for (const [sql] of raw.mock.calls) {
      expect(sql.values.includes('india') !== sql.values.includes('us')).toBe(
        true,
      );
      expect(sql.sql).toMatch(/franchiseId IN/);
    }
    expect(tx.franchise.count).toHaveBeenCalledWith({
      where: {
        id: { in: ['us'] },
        createdAt: { lt: new Date('2026-10-04T18:30:00Z') },
      },
    });
    expect(tx.user.count).toHaveBeenCalledWith({
      where: {
        franchiseId: { in: ['india'] },
        createdAt: { lt: new Date('2026-10-04T18:30:00Z') },
      },
    });
  });
  it('distinguishes missing payment data from real zero revenue', async () => {
    raw.mockResolvedValueOnce([
      {
        totalRevenue: '0',
        totalPayments: 0n,
        successfulPayments: null,
        failedPayments: null,
      },
    ]);
    const empty = await service.query(actor, query);
    expect(empty.summary).toMatchObject({
      totalPayments: 0,
      paymentSuccessRate: null,
      averageTransactionValue: null,
    });
    raw.mockResolvedValueOnce([
      {
        totalRevenue: '0',
        totalPayments: 1n,
        successfulPayments: 1n,
        failedPayments: 0n,
      },
    ]);
    const zero = await service.query(actor, query);
    expect(zero.summary).toMatchObject({
      totalPayments: 1,
      totalRevenue: '0.00',
      averageTransactionValue: 0,
    });
  });
  it('propagates database failures instead of generating a zero report', async () => {
    raw.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(service.query(actor, query, true)).rejects.toThrow(
      'Database unavailable',
    );
  });
  it('rejects invalid dates and unrelated salons before aggregation', async () => {
    await expect(
      service.query(actor, { ...query, dateFrom: '2026-02-30' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.query(actor, { ...query, dateFrom: '2026-10-05' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.salon.findUnique.mockResolvedValueOnce({
      name: 'Other',
      franchiseId: 'other',
    });
    await expect(service.query(actor, query)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(raw).not.toHaveBeenCalled();
  });
  it('infers franchise scope for a salon selected under All Franchises', async () => {
    const result = await service.query(actor, {
      ...query,
      franchiseId: undefined,
    });
    expect(result.scope.franchiseId).toBe('f');
  });
  it('aggregates real benefit records instead of coupon creation', async () => {
    await service.query(actor, { ...query, section: 'details' });
    const sql = raw.mock.calls
      .map(([s]: [{ sql: string }]) => s.sql)
      .join('\n');
    expect(sql).toContain('membership_redemptions');
    expect(sql).toContain("rb.status='COMPLETED'");
    expect(sql).toContain("b.status='COMPLETED'");
    expect(sql).toContain('SUM(b.membershipFee)');
    expect(sql).not.toContain('SUM(mp.price)');
  });
  it('captures complete export groups with database ownership and actual daily buckets', async () => {
    await service.query(actor, { ...query, interval: 'month' }, true);
    const queries = raw.mock.calls.map(([s]) => s);
    expect(queries.every((s) => !s.sql.includes('LIMIT 50'))).toBe(true);
    expect(
      queries.some(
        (s) =>
          s.sql.includes('p.paymentMethod AS method') &&
          s.sql.includes('s.id AS salonId'),
      ),
    ).toBe(true);
    expect(
      queries.some(
        (s) =>
          s.sql.includes('COALESCE(sv.id,i.id) AS id') &&
          s.sql.includes('f.id AS franchiseId'),
      ),
    ).toBe(true);
    expect(
      queries.some(
        (s) =>
          s.values.includes('2026-10-02') && s.values.includes('2026-10-03'),
      ),
    ).toBe(true);
  });
  it('aggregates intervals with exact business-calendar bounds across DST', () => {
    const days = reportBuckets(
      '2026-03-07',
      '2026-03-09',
      'day',
      'America/New_York',
    );
    expect(days[1].to.getTime() - days[1].from.getTime()).toBe(23 * 3600000);
    expect(days[0].from.toISOString()).toBe('2026-03-07T05:00:00.000Z');
    const weeks = reportBuckets(
      '2026-10-01',
      '2026-10-12',
      'week',
      'Asia/Kolkata',
    );
    expect(weeks.map((b) => b.label)).toEqual([
      '2026-10-01',
      '2026-10-05',
      '2026-10-12',
    ]);
    expect(
      reportBuckets('2025-12-31', '2026-01-02', 'year', 'UTC'),
    ).toHaveLength(2);
    expect(() =>
      reportBuckets('2024-01-01', '2026-01-01', 'day', 'UTC'),
    ).toThrow(BadRequestException);
  });
});
