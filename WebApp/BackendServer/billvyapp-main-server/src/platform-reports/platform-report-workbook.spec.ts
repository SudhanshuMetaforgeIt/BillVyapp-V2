import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { buildPlatformWorkbook } from './platform-report-workbook';
import type { PlatformReportRecord } from './platform-reports.service';

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
      tableRef: 'A4:H79',
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
    });
  });
});
