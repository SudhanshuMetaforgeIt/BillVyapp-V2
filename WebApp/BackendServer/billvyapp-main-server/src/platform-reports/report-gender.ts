export const REPORT_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'UNISEX', 'UNSPECIFIED'] as const;

export function reportGender(value: unknown): string {
  return typeof value === 'string' && REPORT_GENDERS.includes(value as typeof REPORT_GENDERS[number])
    ? value : 'UNSPECIFIED';
}

export function genderLabel(value: unknown): string {
  const gender = reportGender(value);
  return gender[0] + gender.slice(1).toLowerCase();
}

/** Quantity, not revenue, determines frequency. All services tied for first are shown. */
export function mostFrequentGenderService(
  rows: { gender?: unknown; name?: unknown; quantity?: unknown }[], gender: string,
) {
  const matching = rows.filter(row => reportGender(row.gender) === gender && Number(row.quantity) > 0);
  if (!matching.length) return { name: 'No service sales', quantity: 0 };
  const quantity = Math.max(...matching.map(row => Number(row.quantity)));
  const names = [...new Set(matching.filter(row => Number(row.quantity) === quantity)
    .map(row => typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Unnamed service'))].sort();
  return { name: names.join('; '), quantity };
}
import type ExcelJS from 'exceljs';


export type ReportVisitor = { id?: unknown; name?: unknown; phone?: unknown; gender?: unknown; bills?: unknown };

export function mostVisitedCustomers(rows: ReportVisitor[]) {
  return REPORT_GENDERS.flatMap(gender => {
    const group = rows.filter(row => reportGender(row.gender) === gender && Number(row.bills) > 0);
    const maximum = group.reduce((max, row) => Math.max(max, Number(row.bills)), 0);
    return group.filter(row => Number(row.bills) === maximum)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)));
  });
}

export function addMostVisitedCustomers(sheet: ExcelJS.Worksheet, row: number, visitors: ReportVisitor[] | undefined, tableName: string) {
  sheet.mergeCells(row, 1, row, 4);
  sheet.getCell(row, 1).value = 'Most-visited customers by gender';
  sheet.getCell(row, 1).font = { bold: true, size: 12 };
  sheet.getRow(row).height = 24;
  const winners = mostVisitedCustomers(visitors ?? []);
  sheet.addTable({
    name: tableName, ref: `A${row + 1}`, headerRow: true, totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Gender', 'Customer Name', 'Mobile Number', 'Completed Visits'].map(name => ({ name, filterButton: true })),
    rows: winners.map(customer => [genderLabel(customer.gender), String(customer.name ?? 'Unnamed customer'), String(customer.phone ?? ''), Number(customer.bills)]),
  });
  if (!winners.length) sheet.getCell(row + 2, 1).value = visitors === undefined ? 'Generate a new report to include customer visits.' : 'No completed visits in this period.';
  for (let index = 0; index < winners.length; index++) {
    const dataRow = sheet.getRow(row + 2 + index);
    dataRow.height = 30;
    dataRow.eachCell(cell => { cell.alignment = { wrapText: true, vertical: 'middle' }; });
    dataRow.getCell(3).numFmt = '@';
    // This column is also used for revenue in the summary above.
    dataRow.getCell(4).numFmt = '0';
  }
}
