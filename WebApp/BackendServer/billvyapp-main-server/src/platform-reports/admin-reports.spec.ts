jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class WorkerHost {},
}));
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import * as workbook from './admin-report-workbook';
import { mkdirSync, writeFileSync } from 'node:fs';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import {
  aggregateAdminBills,
  type AdminReportSnapshot,
  type ReportBill,
} from './admin-report-data';
import {
  adminReportFileName,
  buildAdminWorkbook,
  XLSX_CONTENT_TYPE,
} from './admin-report-workbook';
import type { PrismaService } from '../prisma/prisma.service';
import type { BusinessTimezoneService } from '../common/datetime/business-timezone.service';

const actor: AuthenticatedUser = {
  userId: 'admin',
  email: 'admin@example.test',
  role: RoleCode.ADMIN,
  franchiseId: 'franchise',
  salonId: null,
  sessionId: null,
};
const bill: ReportBill = {
  id: 'bill',
  billNumber: 'B-001',
  date: '2026-10-01',
  branchId: 'branch',
  branch: 'Branch One',
  customerId: 'customer',
  customer: 'Customer One',
  subtotal: 1200,
  discount: 100,
  tax: 0,
  total: 1100,
  collected: 1000,
  status: 'COMPLETED',
  paymentStatus: 'PARTIAL',
  paymentMethods: 'UPI',
};
const branches = [{ id: 'branch', name: 'Branch One' }];
function fixture(bills = [bill]): AdminReportSnapshot {
  const a = aggregateAdminBills(bills, branches, 'day');
  return {
    kind: 'FRANCHISE_OVERVIEW',
    status: 'Ready',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-04',
    branchId: null,
    branch: 'All Branches',
    timeZone: 'Asia/Kolkata',
    interval: 'day',
    generatedOn: '2026-10-04T12:00:00Z',
    generatedBy: 'Franchise Admin',
    stats: {
      totalRevenue: a.totalRevenue,
      totalBills: bills.length,
      totalCustomers: 1,
      totalServices: 2,
      totalStaff: 3,
    },
    bills,
    revenueSeries: a.revenueSeries,
    branchComparison: a.branchComparison,
    customers: a.customers,
    billsOverview: a.billsOverview,
    services: [
      {
        id: 'service1',
        name: 'Cleanup (Basic Facial)',
        quantity: 2,
        revenue: 900,
      },
      {
        id: 'service2',
        name: 'Cleanup (Basic Facial)',
        quantity: 1,
        revenue: 100,
      },
    ],
    branches,
    payments: {
      successful: bills.length ? 1 : 0,
      failed: 0,
      attempts: bills.length ? 1 : 0,
      successRate: bills.length ? 1 : null,
      methods: bills.length
        ? [{ name: 'UPI', revenue: 1000, payments: 1 }]
        : [],
    },
  };
}

describe('Franchise Admin XLSX reports', () => {
  it('generates typed, formatted sheets with matching totals and native worksheet-linked charts', async () => {
    const s = fixture(),
      buffer = await buildAdminWorkbook(s);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(book.worksheets.map((w) => w.name)).toEqual([
      'Executive Summary',
      'Revenue Analysis',
      'Bills - Transactions',
      'Branch Performance',
      'Customer Summary',
      'Payment Methods',
      'Services',
    ]);
    expect(book.getWorksheet('Executive Summary')!.getCell('B13').value).toBe(
      s.stats.totalRevenue,
    );
    expect(book.getWorksheet('Executive Summary')!.getCell('B14').value).toBe(
      s.stats.totalBills,
    );
    expect(book.getWorksheet('Revenue Analysis')!.getCell('A6').value).toEqual(
      new Date('2026-10-01T00:00:00Z'),
    );
    expect(book.getWorksheet('Revenue Analysis')!.getCell('B6').value).toBe(
      1000,
    );
    expect(book.getWorksheet('Revenue Analysis')!.getCell('B6').numFmt).toBe(
      '"₹"#,##0.00',
    );
    expect(book.getWorksheet('Bills - Transactions')!.getCell('A6').value).toBe(
      'B-001',
    );
    expect(book.getWorksheet('Bills - Transactions')!.getCell('H6').value).toBe(
      1100,
    );
    expect(book.getWorksheet('Branch Performance')!.getCell('C6').value).toBe(
      1000,
    );
    const zip = await JSZip.loadAsync(buffer);
    for (const [id, sheet, column, type] of [
      [1, 'Revenue Analysis', 'B', 'lineChart'],
      [2, 'Branch Performance', 'C', 'barChart'],
      [3, 'Customer Summary', 'C', 'barChart'],
      [4, 'Payment Methods', 'B', 'barChart'],
    ]) {
      const chart = await zip.file(`xl/charts/chart${id}.xml`)!.async('string');
      expect(chart).toContain(`<c:${type}>`);
      expect(chart).toContain(`&apos;${sheet}&apos;!$${column}$6:$${column}$6`);
      expect(chart).toContain('<c:v>1000</c:v>');
    }
    expect(
      Object.keys(zip.files).some((path) => path.startsWith('xl/media/')),
    ).toBe(false);
    const sheet = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    expect(sheet.indexOf('<drawing')).toBeLessThan(
      sheet.indexOf('<tableParts'),
    );
    if (process.env.REPORT_QA_OUTPUT) {
      mkdirSync(process.env.REPORT_QA_OUTPUT, { recursive: true });
      writeFileSync(
        `${process.env.REPORT_QA_OUTPUT}/admin-overview.xlsx`,
        buffer,
      );
    }
  });

  it('generates a structurally valid empty workbook without fake transactions', async () => {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      (await buildAdminWorkbook(fixture([]))) as unknown as ExcelJS.Buffer,
    );
    expect(book.getWorksheet('Executive Summary')!.getCell('B22').value).toBe(
      'No data available for the selected period.',
    );
    expect(
      book.getWorksheet('Bills - Transactions')!.getCell('A6').value,
    ).toBeNull();
    expect(book.getWorksheet('Revenue Analysis')!.getCell('A3').value).toBe(
      'No data available for the selected period.',
    );
  });

  it('uses safe meaningful filenames', () => {
    expect(adminReportFileName(fixture())).toBe(
      'BillVyApp_Overview_Report_2026-10-01_to_2026-10-04.xlsx',
    );
    expect(
      adminReportFileName({
        ...fixture(),
        branchId: 'b',
        branch: 'Kukatpally / Saloon "\r\n',
      }),
    ).toBe(
      'BillVyApp_Overview_Kukatpally_Saloon_2026-10-01_to_2026-10-04.xlsx',
    );
  });

  it('keeps all bills beyond the old latest-100 limit and excludes cancelled/draft revenue', () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({
      ...bill,
      id: String(i),
    }));
    rows.push(
      { ...bill, id: 'cancel', status: 'CANCELLED' },
      { ...bill, id: 'draft', status: 'DRAFT' },
    );
    const a = aggregateAdminBills(rows, branches, 'month');
    expect(a.totalRevenue).toBe(120000);
    expect(a.billsOverview.total).toBe(122);
    expect(a.revenueSeries[0].bills).toBe(120);
    expect(a.branchComparison[0].revenue).toBe(a.totalRevenue);
    expect(a.customers[0].revenue).toBe(a.totalRevenue);
    expect(
      aggregateAdminBills(
        [
          { ...bill, date: '2026-10-04' },
          { ...bill, date: '2026-10-05' },
        ],
        branches,
        'week',
      ).revenueSeries.map((r) => r.date),
    ).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('returns the actual XLSX content type and attachment from the controller', async () => {
    const body = Buffer.from('PK');
    const service = {
      download: jest.fn().mockResolvedValue({
        body,
        fileName: adminReportFileName(fixture()),
        contentType: XLSX_CONTENT_TYPE,
      }),
    };
    const controller = new AdminReportsController(
      service as unknown as AdminReportsService,
    );
    const res = { setHeader: jest.fn(), send: jest.fn() };
    await controller.download(actor, 'report', res as never);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      XLSX_CONTENT_TYPE,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="BillVyApp_Overview_Report_2026-10-01_to_2026-10-04.xlsx"',
    );
    expect(res.send).toHaveBeenCalledWith(body);
    expect(Reflect.getMetadata(ROLES_KEY, AdminReportsController)).toEqual([
      RoleCode.ADMIN,
    ]);
  });

  it('rejects caller-supplied franchise IDs and unsupported types at the API boundary', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        { franchiseId: 'another' },
        { type: 'body', metatype: AdminReportQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform(
        { reportType: 'staff' },
        { type: 'body', metatype: AdminReportQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Franchise report authorization and snapshots', () => {
  const tx = {
    salon: { findMany: jest.fn() },
    bill: { count: jest.fn(), findMany: jest.fn() },
    customer: { count: jest.fn() },
    service: { count: jest.fn() },
    user: { count: jest.fn(), findUnique: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    platformReport: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new AdminReportsService(
    prisma as unknown as PrismaService,
    {
      resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
    } as unknown as BusinessTimezoneService,
  );
  const query = {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-04',
    branchId: 'branch',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    tx.salon.findMany.mockResolvedValue(branches);
    tx.bill.count.mockResolvedValue(1);
    tx.bill.findMany.mockResolvedValue([
      {
        ...bill,
        salonId: 'branch',
        billDate: new Date('2026-10-01'),
        paidAmount: 1000,
        salon: { name: 'Branch One' },
        customer: { user: { firstName: 'Customer', lastName: 'One' } },
        items: [],
        payments: [],
      },
    ]);
    tx.customer.count.mockResolvedValue(1);
    tx.service.count.mockResolvedValue(2);
    tx.user.count.mockResolvedValue(3);
    tx.user.findUnique.mockResolvedValue({
      firstName: 'Franchise',
      lastName: 'Admin',
    });
  });
  it.each([
    RoleCode.SUPER_ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  ])('rejects %s access', async (role) => {
    await expect(service.snapshot({ ...actor, role }, query)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects another franchise branch before querying bills', async () => {
    await expect(
      service.snapshot(actor, { ...query, branchId: 'foreign' }),
    ).rejects.toThrow(ForbiddenException);
    expect(tx.bill.findMany).not.toHaveBeenCalled();
  });
  it('validates date ranges', async () => {
    await expect(
      service.snapshot(actor, { dateFrom: '2026-02-30' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.snapshot(actor, { dateFrom: '2026-10-04', dateTo: '2026-10-01' }),
    ).rejects.toThrow(BadRequestException);
  });
  it('uses the selected franchise, branch and date-only bounds for all reporting', async () => {
    const s = await service.snapshot(actor, query),
      dashboard = await service.analytics(actor, query);
    expect(
      (
        (tx.bill.findMany.mock.calls as [unknown][])[0][0] as {
          where: { salon: unknown };
        }
      ).where.salon,
    ).toEqual({
      franchiseId: 'franchise',
      id: 'branch',
    });
    expect(
      (
        (tx.bill.findMany.mock.calls as [unknown][])[0][0] as {
          where: { OR: { billDate: unknown }[] };
        }
      ).where.OR[0].billDate,
    ).toEqual({
      gte: new Date('2026-10-01'),
      lt: new Date('2026-10-05'),
    });
    expect(tx.customer.count).toHaveBeenCalledWith({
      where: {
        bills: { some: { salon: { franchiseId: 'franchise', id: 'branch' } } },
      },
    });
    expect(s.stats.totalRevenue).toBe(dashboard.stats.totalRevenue);
    expect(s.revenueSeries).toEqual(dashboard.revenueSeries);
    expect(s.branchComparison).toEqual(dashboard.branchComparison);
    expect(dashboard).not.toHaveProperty('bills');
  });
  it('paginates all server-side bills and errors instead of silently truncating oversized reports', async () => {
    const rawRows = (await tx.bill.findMany()) as Record<string, unknown>[];
    const raw = rawRows[0];
    tx.bill.findMany
      .mockReset()
      .mockResolvedValueOnce(
        Array.from({ length: 1000 }, (_, i) => ({ ...raw, id: String(i) })),
      )
      .mockResolvedValueOnce([{ ...raw, id: 'last' }]);
    expect((await service.snapshot(actor, query)).stats.totalBills).toBe(1001);
    expect(
      (
        (tx.bill.findMany.mock.calls as [unknown][])[1][0] as {
          cursor: unknown;
        }
      ).cursor,
    ).toEqual({ id: '999' });
    tx.bill.count.mockResolvedValue(50001);
    await expect(service.snapshot(actor, query)).rejects.toThrow('50,000');
  });
  it('enforces franchise scope on history and downloads, and keeps the captured snapshot', async () => {
    prisma.platformReport.findFirst.mockResolvedValue(null);
    await expect(service.download(actor, 'foreign')).rejects.toThrow(
      NotFoundException,
    );
    expect(
      (
        (prisma.platformReport.findFirst.mock.calls as [unknown][])[0][0] as {
          where: unknown;
        }
      ).where,
    ).toMatchObject({ id: 'foreign', franchiseId: 'franchise' });
    prisma.platformReport.findFirst.mockResolvedValue({ snapshot: fixture() });
    const file = await service.download(actor, 'own');
    expect(file.contentType).toBe(XLSX_CONTENT_TYPE);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    prisma.platformReport.findMany.mockResolvedValue([]);
    await service.history(actor);
    expect(
      (
        (prisma.platformReport.findMany.mock.calls as [unknown][])[0][0] as {
          where: { franchiseId: string };
        }
      ).where.franchiseId,
    ).toBe('franchise');
  });
  it('records generation and readiness in the existing report model', async () => {
    prisma.platformReport.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        id: 'report',
        createdAt: new Date(),
      }),
    );
    prisma.platformReport.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        id: 'report',
        name: 'Franchise Overview Report',
        createdAt: new Date(),
      }),
    );
    const result = await service.generate(actor, query);
    expect(result.status).toBe('Ready');
    expect(result.format).toBe('xlsx');
    expect(
      (
        (prisma.platformReport.create.mock.calls as [unknown][])[0][0] as {
          data: { snapshot: { status: string } };
        }
      ).data.snapshot.status,
    ).toBe('Generating');
    expect(
      (
        (prisma.platformReport.create.mock.calls as [unknown][])[0][0] as {
          data: { franchiseId: string };
        }
      ).data.franchiseId,
    ).toBe('franchise');
  });
  it('records a failed export and propagates the error', async () => {
    prisma.platformReport.create.mockResolvedValue({ id: 'failed' });
    const build = jest
      .spyOn(workbook, 'buildAdminWorkbook')
      .mockRejectedValueOnce(new Error('Workbook failed'));
    try {
      await expect(service.generate(actor, query)).rejects.toThrow(
        'Workbook failed',
      );
      expect(prisma.platformReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'failed' },
          data: {
            snapshot: expect.objectContaining({ status: 'Failed' }) as unknown,
          },
        }),
      );
    } finally {
      build.mockRestore();
    }
  });
  it('enqueues a background job when async is true', async () => {
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const asyncService = new AdminReportsService(
      prisma as unknown as PrismaService,
      {
        resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
      } as unknown as BusinessTimezoneService,
      queue as never,
    );
    (prisma as unknown as { salon: { findMany: jest.Mock } }).salon = {
      findMany: jest.fn().mockResolvedValue(branches),
    };
    prisma.platformReport.create.mockResolvedValue({
      id: 'report-bg',
      name: 'Franchise Overview Report',
      createdAt: new Date(),
      snapshot: {
        status: 'Generating',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-04',
        branch: 'Branch One',
        generatedBy: actor.email,
      },
    });

    const res = await asyncService.generate(actor, { ...query, async: true });
    expect(res.status).toBe('Generating');
    expect(queue.add).toHaveBeenCalledWith(
      'generate-admin-export',
      expect.objectContaining({
        reportId: 'report-bg',
        actorUserId: actor.userId,
        franchiseId: actor.franchiseId,
      }),
      expect.objectContaining({
        jobId: 'admin-report-report-bg',
      }),
    );
  });
  it('processes background admin report and updates status to Ready', async () => {
    (
      prisma.platformReport as unknown as { findUnique: jest.Mock }
    ).findUnique = jest.fn().mockResolvedValue({
      id: 'report-bg',
      snapshot: { status: 'Generating' },
    });
    (prisma as unknown as { user: { findUnique: jest.Mock } }).user = {
      findUnique: jest.fn().mockResolvedValue({
        id: actor.userId,
        email: actor.email,
        franchiseId: actor.franchiseId,
      }),
    };
    prisma.platformReport.update.mockResolvedValue({});

    await service.processBackgroundAdminReport({
      reportId: 'report-bg',
      actorUserId: actor.userId,
      franchiseId: actor.franchiseId!,
      query,
    });

    expect(prisma.platformReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-bg' },
        data: {
          snapshot: expect.objectContaining({ status: 'Ready' }),
        },
      }),
    );
  });
});
