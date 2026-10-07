// Read-only database verification; writes only the requested local XLSX artifact.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const {
  ReportAnalyticsService,
} = require('../dist/platform-reports/report-analytics.service');
const {
  buildPlatformWorkbook,
} = require('../dist/platform-reports/platform-report-workbook');
const {
  businessCalendarRangeToUtc,
  parseDateOnlyUtc,
} = require('../dist/common/datetime/datetime');
process.loadEnvFile('.env');
const prisma = new PrismaService(
  new ConfigService({ database: { url: process.env.DATABASE_URL } }),
);
const service = new ReportAnalyticsService(prisma, {
  resolveForUser: async () => 'Asia/Kolkata',
});
const from = process.argv[2] ?? '2026-10-01';
const to = process.argv[3] ?? '2026-10-05';
const target = path.resolve(
  process.argv[4] ??
    '../../../outputs/reports-verification/Financial_Report_2026-10-01_to_2026-10-05.xlsx',
);
const sum = (rows) => rows.reduce((n, r) => n + Number(r.revenue ?? 0), 0);
const near = (a, b) =>
  assert.ok(Math.abs(a - b) < 0.01, `Expected ${a} to equal ${b}`);
(async () => {
  try {
    const actorRow = await prisma.user.findFirst({
      where: { role: { code: 'SUPER_ADMIN' }, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    assert.ok(
      actorRow,
      'An existing active Super Admin is required for verification',
    );
    const actor = {
      userId: actorRow.id,
      email: actorRow.email,
      role: 'SUPER_ADMIN',
      franchiseId: null,
      salonId: null,
      sessionId: null,
    };
    const q = { dateFrom: from, dateTo: to, interval: 'month' };
    const a = await service.query(actor, q, true);
    const range = businessCalendarRangeToUtc(from, to, a.scope.timeZone);
    const payment = await prisma.payment.aggregate({
      where: { status: 'SUCCESS', paymentDate: range },
      _sum: { amount: true },
      _count: { _all: true },
    });
    near(Number(a.summary.totalRevenue), Number(payment._sum.amount ?? 0));
    assert.equal(a.summary.successfulPayments, payment._count._all);
    for (const rows of [
      a.revenue.daily,
      a.revenue.methods,
      a.revenue.salonMethods,
      a.business.salons,
      a.business.franchises,
    ])
      near(sum(rows), Number(a.summary.totalRevenue));
    const lineTotals = await prisma.billItem.aggregate({
      where: {
        itemType: 'SERVICE',
        bill: {
          status: 'COMPLETED',
          billDate: {
            gte: parseDateOnlyUtc(from),
            lt: new Date(parseDateOnlyUtc(to).getTime() + 86400000),
          },
        },
      },
      _sum: { total: true, quantity: true },
    });
    near(sum(a.details.services), Number(lineTotals._sum.total ?? 0));
    assert.equal(
      a.details.services.reduce((n, r) => n + Number(r.quantity), 0),
      Number(lineTotals._sum.quantity ?? 0),
    );
    const billedRange = {
      status: 'COMPLETED',
      billDate: {
        gte: parseDateOnlyUtc(from),
        lt: new Date(parseDateOnlyUtc(to).getTime() + 86400000),
      },
    };
    const billed = await prisma.bill.aggregate({
      where: billedRange,
      _sum: { total: true, membershipFee: true },
    });
    near(
      Number(a.insights.customers[0].billedRevenue),
      Number(billed._sum.total ?? 0),
    );
    near(
      Number(a.details.memberships[0].membershipRevenue),
      Number(billed._sum.membershipFee ?? 0),
    );
    const served = await prisma.bill.groupBy({
      by: ['customerId'],
      where: billedRange,
    });
    assert.equal(
      Number(a.insights.customers[0].customersServed),
      served.length,
    );
    for (const [model, key] of [
      ['customer', 'customerCount'],
      ['user', 'userCount'],
      ['franchise', 'franchiseCount'],
      ['salon', 'salonCount'],
    ]) {
      assert.equal(
        a.summary[key],
        await prisma[model].count({ where: { createdAt: { lt: range.lt } } }),
      );
    }
    assert.equal(
      Number(a.details.memberships[0].members),
      await prisma.membership.count({ where: { createdAt: { lt: range.lt } } }),
    );
    const newMembers = await prisma.membership.count({
      where: { createdAt: range },
    });
    assert.equal(Number(a.details.memberships[0].newMemberships), newMembers);
    const redemptions = await prisma.membershipRedemption.aggregate({
      where: { redeemedAt: range, billItem: { bill: { status: 'COMPLETED' } } },
      _sum: { quantity: true, discountAmount: true },
      _count: { _all: true },
    });
    assert.equal(
      Number(a.details.memberships[0].redemptions),
      redemptions._count._all,
    );
    near(
      Number(a.details.memberships[0].benefitSavings),
      Number(redemptions._sum.discountAmount ?? 0),
    );
    assert.equal(
      Number(a.details.memberships[0].benefitUnits),
      Number(redemptions._sum.quantity ?? 0),
    );
    const options = await service.options(actor);
    for (const salon of options.salons.slice(0, 2)) {
      const scoped = await service.query(
        actor,
        { ...q, franchiseId: salon.franchiseId, salonId: salon.id },
        true,
      );
      assert.ok(scoped.business.salons.every((r) => r.id === salon.id));
      assert.ok(scoped.details.services.every((r) => r.salonId === salon.id));
      assert.ok(scoped.details.plans.every((r) => r.salonId === salon.id));
      assert.ok(
        scoped.revenue.salonMethods.every((r) => r.salonId === salon.id),
      );
      near(sum(scoped.revenue.daily), Number(scoped.summary.totalRevenue));
      const franchise = await service.query(
        actor,
        { ...q, franchiseId: salon.franchiseId },
        true,
      );
      assert.ok(
        franchise.business.salons.every(
          (r) => r.franchiseId === salon.franchiseId,
        ),
      );
    }
    await assert.rejects(() =>
      service.query(
        { ...actor, role: 'ADMIN', franchiseId: options.franchises[0]?.id },
        q,
        true,
      ),
    );
    const blank = await service.query(
      actor,
      { dateFrom: '2020-01-01', dateTo: '2020-01-02', interval: 'day' },
      true,
    );
    assert.equal(blank.summary.totalPayments, 0);
    const blankBuffer = await buildPlatformWorkbook({
      name: 'Empty verification',
      typeLabel: 'Financial',
      dateFrom: '2020-01-01',
      dateTo: '2020-01-02',
      generatedOn: new Date(),
      generatedBy: 'Verifier',
      snapshot: { analytics: blank },
    });
    const blankBook = new ExcelJS.Workbook();
    await blankBook.xlsx.load(blankBuffer);
    assert.equal(
      blankBook.worksheets[0].getCell('A3').value,
      'No data available for the selected period.',
    );
    await assert.rejects(() =>
      service.query(
        actor,
        {
          ...q,
          dateFrom: to,
          dateTo: from === '2026-10-01' ? '2026-09-30' : '1900-01-01',
        },
        true,
      ),
    );
    const buffer = await buildPlatformWorkbook({
      name: `Financial Report — ${from} to ${to}`,
      typeLabel: 'Financial',
      dateFrom: from,
      dateTo: to,
      generatedOn: new Date(),
      generatedBy: `${actorRow.firstName} ${actorRow.lastName}`.trim(),
      franchiseName: a.scope.franchiseName,
      snapshot: { analytics: a, metrics: a.summary },
    });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    const book = new ExcelJS.Workbook();
    await book.xlsx.readFile(target);
    assert.deepEqual(
      book.worksheets.map((s) => s.name),
      [
        '01_Overall Summary',
        '02_Franchise_Salon',
        '03_Salon Performance',
        '04_Salon_Service',
        '05_Payments',
        '06_Customers_Memberships',
        '07_Report Information',
      ],
    );
    assert.equal(
      book.worksheets[0].getCell('B5').value,
      Number(a.summary.totalRevenue),
    );
    if (process.argv[5]) {
      const reference = new ExcelJS.Workbook();
      await reference.xlsx.readFile(process.argv[5]);
      const headerRows = [16, 4, 4, 4, 4, 25, 3];
      book.worksheets.forEach((sheet, i) => {
        const expected = reference.worksheets[i];
        assert.deepEqual(
          sheet.columns.map((c) => c.width),
          expected.columns.map((c) => c.width),
        );
        assert.equal(sheet.getCell('A1').value, expected.getCell('A1').value);
        assert.deepEqual(sheet.getCell('A1').font, expected.getCell('A1').font);
        assert.deepEqual(sheet.getCell('A1').fill, expected.getCell('A1').fill);
        assert.equal(sheet.views[0].ySplit, expected.views[0].ySplit);
        assert.equal(
          sheet.pageSetup.orientation,
          expected.pageSetup.orientation,
        );
        assert.deepEqual(
          sheet.getRow(headerRows[i]).values,
          expected.getRow(headerRows[i]).values,
        );
      });
      assert.equal(
        book.worksheets[0].getCell('B5').numFmt,
        reference.worksheets[0].getCell('B5').numFmt,
      );
      assert.equal(
        book.worksheets[0].getCell('B8').numFmt,
        reference.worksheets[0].getCell('B8').numFmt,
      );
    }
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    assert.ok(!Object.keys(zip.files).some((p) => p.startsWith('xl/charts/')));
    console.log(
      JSON.stringify({
        output: target,
        sheets: 7,
        revenue: a.summary.totalRevenue,
        successfulPayments: a.summary.successfulPayments,
        services: a.details.services.length,
        salons: a.business.salons.length,
        checks:
          'live DB totals, filter scopes, authorization, ZIP CRC, sheet names, no charts',
      }),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
