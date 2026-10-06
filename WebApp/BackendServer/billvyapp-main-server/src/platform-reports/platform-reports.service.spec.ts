jest.mock('../generated/prisma/client', () => {
  const runtime = jest.requireActual<
    typeof import('@prisma/client/runtime/client')
  >('@prisma/client/runtime/client');
  return {
    Prisma: { sql: runtime.sqltag, join: runtime.join, empty: runtime.empty },
  };
});
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformReportsController } from './platform-reports.controller';
import { PlatformReportsService } from './platform-reports.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const actor: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function reportRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    name: 'Financial Report — 2026-09-01 to 2026-09-30',
    description: 'Financial platform snapshot',
    type: 'FINANCIAL',
    format: 'EXCEL',
    dateFrom: new Date(Date.UTC(2026, 8, 1)),
    dateTo: new Date(Date.UTC(2026, 8, 30)),
    franchiseId: null,
    generatedById: 'sa-1',
    snapshot: {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      franchiseId: null,
      franchiseName: null,
      metrics: {
        totalRevenue: '1500.00',
        successfulPayments: 3,
        totalPayments: 4,
        userCount: 10,
        customerCount: 5,
        franchiseCount: 2,
        salonCount: 3,
      },
    },
    createdAt: new Date('2026-09-30T10:00:00.000Z'),
    updatedAt: new Date('2026-09-30T10:00:00.000Z'),
    generatedBy: {
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'root@example.com',
    },
    franchise: null,
    ...overrides,
  };
}

describe('PlatformReportsService', () => {
  const prisma = {
    platformReport: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    franchise: { findUnique: jest.fn(), count: jest.fn() },
    payment: { aggregate: jest.fn(), count: jest.fn() },
    user: { count: jest.fn() },
    customer: { count: jest.fn() },
    salon: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const analytics = { query: jest.fn() };
  let service: PlatformReportsService;

  beforeEach(() => {
    jest.resetAllMocks();
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new PlatformReportsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      {
        resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
        getPlatformTimezone: jest.fn().mockResolvedValue('Asia/Kolkata'),
      } as never,
      analytics as never,
    );
  });

  function stubAggregate() {
    analytics.query.mockResolvedValue({
      scope: {
        franchiseId: null,
        franchiseName: null,
        salonId: null,
        salonName: null,
      },
      summary: {
        totalRevenue: '1500.00',
        successfulPayments: 3,
        totalPayments: 4,
        userCount: 10,
        customerCount: 5,
        franchiseCount: 2,
        salonCount: 3,
      },
      revenue: {
        series: [{ period: '2026-09-01', revenue: 1500, transactions: 3 }],
        methods: [],
        statuses: [],
      },
    });
  }

  it('generates a report with snapshot metrics', async () => {
    stubAggregate();
    prisma.platformReport.create.mockResolvedValue(reportRow());

    const result = await service.generate(
      actor,
      {
        type: 'financial',
        format: 'excel',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
      },
      ctx,
    );

    expect(result.type).toBe('financial');
    expect(result.format).toBe('excel');
    expect(result.generatedBy).toBe('Super Admin');
    expect(result.dateFrom).toBe('2026-09-01');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_REPORT_GENERATED' }),
    );
  });

  it('persists the same analytics captured for dashboard filters, including salon metadata', async () => {
    stubAggregate();
    analytics.query.mockResolvedValueOnce({
      scope: {
        franchiseId: 'f',
        franchiseName: 'Original franchise',
        salonId: 's',
        salonName: 'Original salon',
      },
      summary: {
        totalRevenue: '1500.00',
        successfulPayments: 3,
        totalPayments: 4,
      },
    });
    prisma.platformReport.create.mockResolvedValue(reportRow());
    await service.generate(
      actor,
      {
        type: 'business',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        salonId: 's',
        interval: 'week',
      },
      ctx,
    );
    expect(analytics.query).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ salonId: 's', interval: 'week' }),
      true,
    );
    const [[created]] = prisma.platformReport.create.mock.calls as [
      { data: { franchiseId: string; snapshot: Record<string, unknown> } },
    ][];
    expect(created.data.franchiseId).toBe('f');
    expect(created.data.snapshot).toMatchObject({
      salonId: 's',
      salonName: 'Original salon',
      metrics: { totalRevenue: '1500.00' },
    });
  });

  it('rejects unsupported PDF generation rather than relabeling CSV as PDF', async () => {
    await expect(
      service.generate(
        actor,
        {
          type: 'business',
          format: 'pdf',
          dateFrom: '2026-09-01',
          dateTo: '2026-09-30',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.platformReport.create).not.toHaveBeenCalled();
  });

  it('rejects inverted date ranges', async () => {
    await expect(
      service.generate(
        actor,
        {
          type: 'financial',
          dateFrom: '2026-09-30',
          dateTo: '2026-09-01',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists reports with type summary', async () => {
    prisma.platformReport.findMany.mockResolvedValue([reportRow()]);
    prisma.platformReport.count.mockResolvedValue(1);
    prisma.platformReport.groupBy.mockResolvedValue([
      { type: 'FINANCIAL', _count: { _all: 1 } },
    ]);

    const result = await service.list(actor, { page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.summary.total).toBe(1);
    expect(prisma.platformReport.count).not.toHaveBeenCalled();
    expect(
      result.summary.byType.find((t) => t.type === 'financial')?.count,
    ).toBe(1);
  });

  it('uses the same scope filters for report rows and grouped pagination totals', async () => {
    prisma.platformReport.findMany.mockResolvedValue([]);
    prisma.platformReport.groupBy.mockResolvedValue([
      { type: 'FINANCIAL', _count: { _all: 3 } },
      { type: 'BUSINESS', _count: { _all: 2 } },
    ]);
    const result = await service.list(actor, {
      page: 2,
      limit: 2,
      franchiseId: 'fr-1',
    });
    const list = prisma.platformReport.findMany.mock.calls[0][0];
    const grouped = prisma.platformReport.groupBy.mock.calls[0][0];
    expect(list.where).toEqual(grouped.where);
    expect(list.where).toMatchObject({ franchiseId: 'fr-1' });
    expect(list).toMatchObject({ skip: 2, take: 2 });
    expect(result.meta.total).toBe(5);
    expect(prisma.platformReport.count).not.toHaveBeenCalled();
  });

  it('returns zero totals for an empty grouped report result', async () => {
    prisma.platformReport.findMany.mockResolvedValue([]);
    prisma.platformReport.groupBy.mockResolvedValue([]);
    const result = await service.list(actor, { page: 1, limit: 10 });
    expect(result.meta.total).toBe(0);
    expect(result.summary.byType.every((item) => item.count === 0)).toBe(true);
  });

  it('downloads CSV of the snapshot', async () => {
    prisma.platformReport.findUnique.mockResolvedValue(reportRow());

    const file = await service.download(actor, 'pr-1');

    expect(file.contentType).toContain('text/csv');
    expect(file.fileName).toMatch(/\.csv$/);
    expect(file.body).toContain('totalRevenue');
    expect(file.body).toContain('1500.00');
  });

  it('keeps snapshot names stable and neutralizes spreadsheet formulas in CSV', async () => {
    const row = reportRow({
      name: '=HYPERLINK("bad")',
      franchise: { id: 'f', name: 'Renamed franchise' },
      snapshot: {
        franchiseName: 'Original franchise',
        metrics: { totalRevenue: '1500.00' },
        analytics: { revenue: { series: [{ revenue: 1500 }] } },
      },
    });
    prisma.platformReport.findUnique.mockResolvedValue(row);
    const report = await service.findOne(actor, 'pr-1');
    expect(report.franchiseName).toBe('Original franchise');
    const file = await service.download(actor, 'pr-1');
    expect(file.body).toContain("'=HYPERLINK");
    expect(file.body).toContain('analytics.revenue.series.0.revenue');
  });

  it('throws when downloading a missing report', async () => {
    prisma.platformReport.findUnique.mockResolvedValue(null);
    await expect(service.download(actor, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('PlatformReportsController roles', () => {
  it('is restricted to SUPER_ADMIN', () => {
    const roles: unknown = Reflect.getMetadata(
      ROLES_KEY,
      PlatformReportsController,
    );
    expect(roles).toEqual([RoleCode.SUPER_ADMIN]);
  });
});
