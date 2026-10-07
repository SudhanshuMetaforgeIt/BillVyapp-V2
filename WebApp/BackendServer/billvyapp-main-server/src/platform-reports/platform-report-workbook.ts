import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { PlatformReportRecord } from './platform-reports.service';
import type { ReportAnalytics } from './report-analytics.service';

const currency = '\\₹#,##0.00';
const percent = '0.00%';
const blue = 'FF1F4E78';
const empty = 'No data available for the selected period.';
type Value = string | number | Date | null;
type Row = Record<string, string | number | null>;
const num = (value: unknown): number | null =>
  value == null ? null : Number(value);
const text = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
const share = (value: unknown, total: number) =>
  total ? Number(value ?? 0) / total : null;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const border: ExcelJS.Border = { style: 'thin', color: { argb: 'FFB7B7B7' } };
const fill = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

function writeRow(
  ws: ExcelJS.Worksheet,
  index: number,
  values: Value[],
  formats: Record<number, string> = {},
  header = false,
) {
  const row = ws.getRow(index);
  row.values = values;
  let height = 15;
  values.forEach((value, i) => {
    const cell = row.getCell(i + 1);
    cell.font = {
      name: 'Calibri',
      size: 11,
      ...(header ? { bold: true, color: { argb: 'FFFFFFFF' } } : {}),
    };
    cell.border = { top: border, bottom: border, left: border, right: border };
    cell.alignment = { vertical: 'middle', wrapText: true };
    if (value instanceof Date) cell.alignment.horizontal = 'left';
    if (header) cell.fill = fill(blue);
    if (formats[i + 1] && !header) cell.numFmt = formats[i + 1];
    const width = ws.getColumn(i + 1).width ?? 12;
    if (typeof value === 'string')
      height = Math.max(
        height,
        Math.ceil(value.length / Math.max(8, width - 2)) * 15,
      );
  });
  // Reference heights are automatic. Explicit expansion prevents clipping long dynamic names.
  if (height > 15) row.height = height;
}
function section(
  ws: ExcelJS.Worksheet,
  row: number,
  title: string,
  columns: number,
) {
  ws.mergeCells(row, 1, row, columns);
  const cell = ws.getCell(row, 1);
  cell.value = title;
  cell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: blue } };
  cell.fill = fill('FFD9EAF7');
}
function table(
  ws: ExcelJS.Worksheet,
  row: number,
  headers: string[],
  values: Value[][],
  formats: Record<number, string> = {},
) {
  const tableName = (
    {
      '02_Franchise_Salon': 'FranchiseSalon',
      '03_Salon Performance': 'SalonPerformance',
      '04_Salon_Service': 'SalonServices',
      '05_Payments': 'Payments',
      '06_Customers_Memberships': 'MembershipPlans',
    } as Record<string, string>
  )[ws.name];
  if (tableName && (row === 4 || row === 25))
    ws.addTable({
      name: tableName,
      ref: `A${row}`,
      headerRow: true,
      totalsRow: false,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: headers.map((name) => ({ name, filterButton: true })),
      rows: values,
    });
  writeRow(ws, row, headers, {}, true);
  values.forEach((value, i) => writeRow(ws, row + 1 + i, value, formats));
  if (!values.length) ws.getCell(row + 1, 1).value = empty;
  return row + Math.max(1, values.length) + 3;
}

/** Reproduces the supplied seven-sheet reference without embedding its sample data. */
export async function buildPlatformWorkbook(
  record: PlatformReportRecord,
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = 'BillVyApp';
  book.created = record.generatedOn;
  const a = record.snapshot.analytics as ReportAnalytics | undefined;
  const m =
    a?.summary ??
    (record.snapshot.metrics as
      Partial<NonNullable<ReportAnalytics['summary']>> | undefined);
  const total = Number(m?.totalRevenue ?? 0);
  const salons = a?.business?.salons ?? [];
  const franchises = a?.business?.franchises ?? [];
  const create = (name: string, title: string, widths: number[]) => {
    const ws = book.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
      properties: { defaultRowHeight: 15 },
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.75,
          right: 0.75,
          top: 1,
          bottom: 1,
          header: 0.5,
          footer: 0.5,
        },
      },
    });
    ws.columns = widths.map((width) => ({ width }));
    ws.mergeCells(1, 1, 1, widths.length);
    ws.getCell('A1').value = title;
    ws.getCell('A1').font = {
      name: 'Calibri',
      size: 18,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    ws.getCell('A1').fill = fill(blue);
    ws.getCell('A1').alignment = { vertical: 'middle' };
    ws.getRow(1).height = 30;
    return ws;
  };
  const summary = create(
    '01_Overall Summary',
    'SALON BUSINESS & FRANCHISE FINANCIAL REPORT',
    [42, 28, 23, 21, 21, 17],
  );
  summary.getCell('A2').value = 'Report Period';
  summary.getCell('B2').value =
    `${date(record.dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/ /g, '-')} to ${date(record.dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/ /g, '-')}`;
  summary.getCell('D2').value = 'Generated By';
  summary.getCell('E2').value = record.generatedBy;
  for (const cell of ['A2', 'D2'])
    summary.getCell(cell).font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF666666' },
    };
  section(summary, 4, '1. Overall Business Performance', 6);
  const metrics: [string, Value, string][] = [
    ['Total Revenue', num(m?.totalRevenue), currency],
    ['Successful Payments', num(m?.successfulPayments), '#,##0'],
    ['Failed Payments', num(m?.failedPayments), '#,##0'],
    [
      'Payment Success Rate',
      m?.paymentSuccessRate == null ? null : m.paymentSuccessRate / 100,
      percent,
    ],
    ['Customers', num(m?.customerCount), '#,##0'],
    ['Users / Staff', num(m?.userCount), '#,##0'],
    ['Franchises', num(m?.franchiseCount), '#,##0'],
    ['Salons / Shops', num(m?.salonCount), '#,##0'],
    ['Average Transaction Value', num(m?.averageTransactionValue), currency],
  ];
  metrics.forEach(([label, value, format], i) => {
    writeRow(summary, i + 5, [label, value], { 2: format });
    summary.getCell(i + 5, 1).font = { name: 'Calibri', size: 11, bold: true };
    summary.getCell(i + 5, 1).fill = fill('FFEAF3F8');
    summary.getCell(i + 5, 2).font = { name: 'Calibri', size: 12, bold: true };
    summary.getCell(i + 5, 2).fill = fill(i === 0 ? 'FFE2F0D9' : 'FFFFFFFF');
  });
  section(summary, 15, '2. Business Hierarchy', 6);
  const hierarchy: Value[][] = [
    [
      'Business / Organization',
      'Overall Business',
      '—',
      num(m?.totalRevenue),
      num(m?.successfulPayments),
      num(m?.customerCount),
    ],
  ];
  const seen = new Set<string>();
  for (const f of franchises) {
    hierarchy.push([
      'Franchise',
      f.name,
      'Overall Business',
      num(f.revenue),
      num(f.transactions),
      num(f.customers),
    ]);
    seen.add(String(f.id));
    for (const s of salons.filter((s) => s.franchiseId === f.id))
      hierarchy.push([
        '  Salon / Shop',
        s.name,
        f.name,
        num(s.revenue),
        num(s.transactions),
        num(s.customers),
      ]);
  }
  // Membership/bill activity can exist without successful payments in the period.
  for (const s of salons.filter((s) => !seen.has(String(s.franchiseId))))
    hierarchy.push([
      '  Salon / Shop',
      s.name,
      s.franchise,
      num(s.revenue),
      num(s.transactions),
      num(s.customers),
    ]);
  const dailyRow = table(
    summary,
    16,
    ['Level', 'Name', 'Parent', 'Revenue', 'Transactions', 'Customers'],
    hierarchy,
    { 4: currency },
  );
  // Retain the reference's extra whitespace after a small hierarchy.
  const dailySection = Math.max(23, dailyRow);
  section(summary, dailySection, '3. Daily Revenue', 6);
  const daily = a?.revenue?.daily;
  const dailyMap = new Map((daily ?? []).map((r) => [r.period, r]));
  const dailyRows: Value[][] = [];
  if (daily)
    for (
      let d = date(record.dateFrom);
      d <= date(record.dateTo);
      d = new Date(d.getTime() + 86400000)
    ) {
      const r = dailyMap.get(d.toISOString().slice(0, 10));
      dailyRows.push([
        d,
        num(r?.revenue) ?? 0,
        num(r?.transactions) ?? 0,
        num(r?.averageTransaction) ?? 0,
        share(r?.revenue, total),
        r ? 'Recorded' : 'No transactions',
      ]);
    }
  table(
    summary,
    dailySection + 1,
    [
      'Date',
      'Revenue',
      'Transactions',
      'Average Transaction',
      'Revenue Share',
      'Status',
    ],
    dailyRows,
    { 1: 'dd-mmm-yyyy', 2: currency, 4: currency, 5: percent },
  );
  const headers = [
    'Franchise',
    'Salon / Shop',
    'Revenue',
    'Transactions',
    'Customers',
    'Memberships',
    'Services Sold',
    'Avg Bill',
    'Avg Transaction',
  ];
  const salonValues = (s: Row): Value[] => [
    s.franchise,
    s.name,
    num(s.revenue),
    num(s.transactions),
    num(s.customers),
    num(s.memberships),
    num(s.servicesSold),
    num(s.averageBill),
    num(s.averageTransaction),
  ];
  const relationship = create(
    '02_Franchise_Salon',
    'FRANCHISE → SALON PERFORMANCE',
    [42, 19, 12, 14, 12, 13, 15, 13, 17],
  );
  relationship.mergeCells('A2:I2');
  relationship.getCell('A2').value =
    'Parent franchise and child salon/shop performance';
  relationship.getCell('A2').font = {
    name: 'Calibri',
    size: 11,
    italic: true,
    color: { argb: 'FF666666' },
  };
  table(
    relationship,
    4,
    headers,
    [...salons]
      .sort((x, y) =>
        String(x.franchiseId).localeCompare(String(y.franchiseId)),
      )
      .map(salonValues),
    { 3: currency, 8: currency, 9: currency },
  );
  const performance = create(
    '03_Salon Performance',
    'SALON / SHOP PERFORMANCE',
    [26, 19, 12, 14, 12, 13, 15, 13, 17, 20, 27],
  );
  table(
    performance,
    4,
    [...headers, 'Revenue Share', 'Performance Note'],
    salons.map((s) => [...salonValues(s), share(s.revenue, total), null]),
    { 3: currency, 8: currency, 9: currency, 10: percent },
  );
  const services = create(
    '04_Salon_Service',
    'SALON → SERVICE REVENUE DETAIL',
    [32, 19, 30, 15, 14, 12, 15, 22],
  );
  table(
    services,
    4,
    [
      'Franchise',
      'Salon / Shop',
      'Service',
      'Quantity Sold',
      'Transactions',
      'Revenue',
      'Average Price',
      'Revenue Share',
    ],
    [...(a?.details?.services ?? [])]
      .sort(
        (x, y) =>
          String(x.franchiseId).localeCompare(String(y.franchiseId)) ||
          String(x.salonId).localeCompare(String(y.salonId)),
      )
      .map((s) => [
        s.franchise ?? null,
        s.salon,
        s.name,
        num(s.quantity),
        num(s.transactions),
        num(s.revenue),
        num(s.averagePrice),
        share(s.revenue, total),
      ]),
    { 6: currency, 7: currency, 8: percent },
  );
  const payments = create(
    '05_Payments',
    'PAYMENT PERFORMANCE',
    [24, 19, 16, 25, 12, 12, 14, 21],
  );
  const paymentSection = table(
    payments,
    4,
    [
      'Franchise',
      'Salon / Shop',
      'Payment Method',
      'Successful Transactions',
      'Attempts',
      'Revenue',
      'Success Rate',
      'Revenue Share',
    ],
    (a?.revenue?.salonMethods ?? []).map((p) => [
      p.franchise,
      p.salon,
      p.method,
      num(p.successful),
      num(p.attempts),
      num(p.revenue),
      share(p.successful, Number(p.attempts)),
      share(p.revenue, total),
    ]),
    { 6: currency, 7: percent, 8: percent },
  );
  section(payments, paymentSection, 'Payment Status Summary', 4);
  table(
    payments,
    paymentSection + 1,
    ['Status', 'Attempts', 'Amount', 'Success Rate'],
    (a?.revenue?.statuses ?? []).map((p) => [
      p.status,
      num(p.attempts),
      num(p.amount),
      p.status === 'SUCCESS' ? share(p.attempts, Number(m?.totalPayments)) : 0,
    ]),
    { 3: currency, 4: percent },
  );
  const customers = create(
    '06_Customers_Memberships',
    'CUSTOMERS & MEMBERSHIPS',
    [25, 19, 42, 12, 12, 13, 16],
  );
  section(customers, 4, 'Customer Insights', 7);
  const c = a?.insights?.customers?.[0];
  table(
    customers,
    5,
    ['Metric', 'Value', 'Definition'],
    [
      [
        'New Customers',
        num(c?.newCustomers),
        'Customers acquired during report period',
      ],
      [
        'Customers Served',
        num(c?.customersServed),
        'Customers with billed activity',
      ],
      [
        'Returning Customers',
        num(c?.returningCustomers),
        'Customers with earlier completed bills in this scope',
      ],
      [
        'Billed Revenue',
        num(c?.billedRevenue),
        'Revenue attributed to billed customers',
      ],
      [
        'Average Customer Spend',
        num(c?.averageCustomerSpend),
        'Average spend based on report analytics',
      ],
    ],
  );
  for (const row of [9, 10]) customers.getCell(row, 2).numFmt = currency;
  section(customers, 12, 'Membership Summary', 4);
  const membership = a?.details?.memberships?.[0];
  table(
    customers,
    13,
    ['Metric', 'Value'],
    [
      ['Members', 'members'],
      ['Redemptions', 'redemptions'],
      ['Benefit Units', 'benefitUnits'],
      ['Benefit Visits', 'benefitVisits'],
      ['Benefit Savings', 'benefitSavings'],
      ['New Memberships', 'newMemberships'],
      ['Active Memberships', 'activeMemberships'],
      ['Membership Revenue', 'membershipRevenue'],
      ['Expired Memberships', 'expiredMemberships'],
    ].map(([label, key]) => [label, num(membership?.[key])]),
  );
  for (const row of [18, 21]) customers.getCell(row, 2).numFmt = currency;
  section(customers, 24, 'Membership Plans', 7);
  table(
    customers,
    25,
    [
      'Franchise',
      'Salon / Shop',
      'Membership Plan',
      'Members',
      'Revenue',
      'Redemptions',
      'Active Members',
    ],
    (a?.details?.plans ?? []).map((p) => [
      p.franchise ?? null,
      p.salon,
      p.name,
      num(p.members),
      num(p.revenue),
      num(p.redemptions),
      num(p.activeMembers),
    ]),
  );
  const info = create(
    '07_Report Information',
    'REPORT INFORMATION & DATA SCOPE',
    [33, 42, 32, 12],
  );
  table(
    info,
    3,
    ['Field', 'Value', 'Notes'],
    [
      ['Report Name', record.name, 'Source report'],
      ['Report Type', record.typeLabel, 'Source report'],
      ['Date From', date(record.dateFrom), null],
      ['Date To', date(record.dateTo), null],
      ['Generated By', record.generatedBy, null],
      ['Generated On', record.generatedOn, 'Source timestamp'],
      ['Timezone', a?.scope?.timeZone ?? text(record.snapshot.timeZone), null],
      ['Total Revenue', num(m?.totalRevenue), 'Source report'],
      ['Successful Payments', num(m?.successfulPayments), 'Source report'],
      ['Total Payments', num(m?.totalPayments), 'Source report'],
      ['Customers', num(m?.customerCount), 'Source report'],
      ['Users', num(m?.userCount), 'Source report'],
      ['Franchises', num(m?.franchiseCount), 'Overall count in source report'],
      ['Salons', num(m?.salonCount), 'Overall count in source report'],
      [
        'Data Scope Note',
        `Franchise: ${a?.scope?.franchiseName ?? record.franchiseName ?? 'All'}; Salon: ${a?.scope?.salonName ?? text(record.snapshot.salonName, 'All')}. Revenue uses successful payments by payment date; service and customer activity uses completed bills by bill date. ${daily ? 'Hierarchy uses database IDs. No organization model exists.' : 'Legacy snapshot lacks daily and salon payment details. Regenerate for complete detail.'}`,
        'Important',
      ],
    ],
  );
  for (const row of [6, 7]) info.getCell(row, 2).numFmt = 'dd-mmm-yyyy';
  info.getCell('B9').numFmt = 'dd-mmm-yyyy hh:mm "UTC"';
  if (!m?.totalPayments && !salons.length) summary.getCell('A3').value = empty;
  const zip = await JSZip.loadAsync(await book.xlsx.writeBuffer());
  // ExcelJS emits totalsRowShown="1" for tables with totalsRow:false.
  // Explicitly hide totals so consumers do not style the final detail as a total.
  for (const entry of Object.values(zip.files)) {
    if (/^xl\/tables\/table\d+\.xml$/.test(entry.name))
      zip.file(
        entry.name,
        (await entry.async('string')).replace(
          'totalsRowShown="1"',
          'totalsRowShown="0"',
        ),
      );
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
