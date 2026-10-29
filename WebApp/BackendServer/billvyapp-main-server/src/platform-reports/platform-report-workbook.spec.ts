import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { buildPlatformWorkbook } from './platform-report-workbook';
import type { PlatformReportRecord } from './platform-reports.service';
import type { ReportAnalytics } from './report-analytics.service';

function record() {
  return {
    name: 'Financial Report',
    typeLabel: 'Financial',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-05',
    generatedOn: new Date('2026-10-07T00:00:00Z'),
    generatedBy: 'Report tester',
    franchiseName: null,
    snapshot: {
      analytics: {
        scope: { timeZone: 'Asia/Kolkata' },
        summary: {
          totalRevenue: '0.00',
          successfulPayments: 0,
          totalPayments: 0,
          failedPayments: 0,
        },
        business: { salons: [], franchises: [] },
        revenue: { daily: [], salonMethods: [], statuses: [] },
        details: { services: [], plans: [], memberships: [] },
      },
    },
  } as unknown as PlatformReportRecord;
}
describe('Reference business workbook', () => {
  it('exports service gender and separate, typed gender totals including legacy missing data', async () => {
    const r = record();
    const a = r.snapshot.analytics as ReportAnalytics;
    a.details!.services = [{ name: 'Haircut', salon: 'Branch', gender: 'FEMALE', revenue: 125.5, quantity: 1 }];
    a.genders = {
      basis: 'CUSTOMER',
      mostVisited: [
        { id: 'male', name: 'Rohit Sharma', phone: '+919876543210', gender: 'MALE', bills: 8 },
        { id: 'female', name: 'Riya Sharma', phone: '+919876543211', gender: 'FEMALE', bills: 7 },
      ],
      topServices: [{ gender: 'MALE', name: 'Beard Trim', quantity: 10 }, { gender: 'FEMALE', name: 'Facial', quantity: 7 }],
      services: [{ gender: 'MALE', bills: 2, customers: 1, collected: 125.5, billedTotal: 150 }, { gender: null, bills: 1, customers: 1, collected: 10, billedTotal: 10 }],
      customers: [{ gender: 'FEMALE', bills: 3, customers: 2, collected: 135.5, billedTotal: 160 }],
    };
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await buildPlatformWorkbook(r) as unknown as ExcelJS.Buffer);
    expect(book.getWorksheet('04_Salon_Service')!.getCell('I5').value).toBe('Female');
    const ws = book.getWorksheet('08_Gender Breakdown')!;
    expect(ws.getCell('A5').value).toBe('Male');
    expect(ws.getCell('B5').value).toBe(0);
    expect(ws.getCell('D6').value).toBe(135.5);
    expect(ws.getCell('D6').numFmt).toContain('₹');
    expect(ws.getCell('A9').value).toBe('Unspecified');
    expect(ws.getCell('B6').value).toBe(3);
    expect(ws.getCell('F5').value).toBe('Beard Trim');
    expect(ws.getCell('G5').value).toBe(10);
    expect(ws.getCell('F6').value).toBe('Facial');
    expect(ws.getCell('G6').value).toBe(7);
    expect(ws.getCell('B14').value).toBe('Rohit Sharma');
    expect(ws.getCell('C14').value).toBe('+919876543210');
    expect(ws.getCell('D14').value).toBe(8);
    expect(ws.getCell('D14').numFmt).toBe('0');
    expect(ws.getCell('D15').numFmt).toBe('0');
    expect(ws.getCell('A15').value).toBe('Female');
    expect(ws.getCell('B15').value).toBe('Riya Sharma');
    expect(ws.getCell('C15').numFmt).toBe('@');
  });
  it('exports separate currency summaries and complete sheet sets with unique tables', async () => {
    const source = record();
    const base = source.snapshot.analytics as Record<string, unknown>;
    source.snapshot.analytics = {
      scope: { timeZone: 'UTC' },
      currencyGroups: [
        {
          ...base,
          scope: { currency: 'INR', timeZone: 'UTC' },
          summary: {
            totalRevenue: '1500.00',
            successfulPayments: 1,
            totalPayments: 1,
            averageTransactionValue: 1500,
          },
        },
        {
          ...base,
          scope: { currency: 'USD', timeZone: 'UTC' },
          summary: {
            totalRevenue: '25.00',
            successfulPayments: 1,
            totalPayments: 1,
            averageTransactionValue: 25,
          },
        },
      ],
    };
    const buffer = await buildPlatformWorkbook(source);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(book.worksheets).toHaveLength(17);
    expect(book.getWorksheet('Currency Totals')?.getCell('B2').value).toBe(
      1500,
    );
    expect(book.getWorksheet('Currency Totals')?.getCell('B3').value).toBe(25);
    expect(
      book.getWorksheet('INR_01_Overall Summary')?.getCell('B5').numFmt,
    ).toContain('₹');
    expect(
      book.getWorksheet('USD_01_Overall Summary')?.getCell('B5').numFmt,
    ).toContain('$');
    expect(
      book.getWorksheet('USD_01_Overall Summary')?.getCell('B5').value,
    ).toBe(25);
    const zip = await JSZip.loadAsync(buffer);
    const tables = await Promise.all(
      Object.values(zip.files)
        .filter((e) => /^xl\/tables\/table\d+\.xml$/.test(e.name))
        .map((e) => e.async('string')),
    );
    const names = tables.map((xml) => xml.match(/ name="([^"]+)"/)?.[1]);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('INR_FranchiseSalon');
    expect(names).toContain('USD_FranchiseSalon');
  });
  it('preserves the seven-sheet structure and empty-period message without fake detail rows', async () => {
    const buffer = await buildPlatformWorkbook(record());
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(book.worksheets.map((s) => s.name)).toEqual([
      '01_Overall Summary',
      '02_Franchise_Salon',
      '03_Salon Performance',
      '04_Salon_Service',
      '05_Payments',
      '06_Customers_Memberships',
      '07_Report Information',
      '08_Gender Breakdown',
    ]);
    expect(book.worksheets[0].getCell('A3').value).toBe(
      'No data available for the selected period.',
    );
    expect(book.worksheets[3].getCell('A5').value).toBe(
      'No data available for the selected period.',
    );
    expect(book.worksheets[0].getCell('A25').type).toBe(ExcelJS.ValueType.Date);
    expect(book.worksheets[0].getCell('F25').value).toBe('No transactions');
    for (const s of book.worksheets) {
      expect(s.views[0]).toMatchObject({
        state: 'frozen',
        ySplit: 3,
        showGridLines: false,
      });
      expect(s.pageSetup).toMatchObject({
        orientation: 'landscape',
        fitToWidth: 1,
        fitToHeight: 0,
      });
    }
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    expect(
      Object.keys(zip.files).filter((p) => p.startsWith('xl/charts/')),
    ).toHaveLength(0);
  });
  it('writes all service groups, native table filters, reference styles and typed money', async () => {
    const r = record();
    const analytics = r.snapshot.analytics as {
      details: { services: unknown[] };
    };
    analytics.details.services = Array.from({ length: 75 }, (_, i) => ({
      id: `service-${i}`,
      salonId: 'salon',
      franchiseId: 'franchise',
      franchise: 'Franchise',
      salon: 'Salon',
      name: 'Full Arms & Underarms Waxing',
      quantity: 2,
      transactions: 1,
      revenue: 1234.5,
      averagePrice: 617.25,
    }));
    const buffer = await buildPlatformWorkbook(r);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const s = book.worksheets[3];
    expect(s.rowCount).toBe(79);
    expect(s.getCell('F79').value).toBe(1234.5);
    expect(s.getCell('F79').numFmt).toContain('₹');
    expect(s.getCell('F79').numFmt).toContain('#,##0.00');
    expect(s.getCell('A4').font).toMatchObject({
      name: 'Calibri',
      bold: true,
      color: { argb: 'FFFFFFFF' },
    });
    expect(s.getTables()[0].table).toMatchObject({
      name: 'SalonServices',
      tableRef: 'A4:I79',
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
    });
  });
});
