import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { secureWorkbookText } from './workbook-security';
describe('Spreadsheet text boundary', () => {
  it('serializes attack labels as exact text while preserving trusted formulas, numbers and layout', async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Existing layout');
    const labels = [
      '=HYPERLINK("https://evil.test","click")',
      '+cmd|payload',
      '-1+2',
      '@SUM(A1)',
      '\t=1+1',
      '\r=1+1',
      '\n=1+1',
      '  =1+1',
    ];
    labels.forEach(
      (value, index) => (sheet.getCell(index + 1, 1).value = value),
    );
    sheet.getCell('B1').value = { formula: 'SUM(B2:B3)', result: 3 };
    sheet.getCell('B2').value = 1;
    sheet.getCell('B3').value = 2;
    sheet.getColumn(1).width = 42;
    sheet.getCell('A1').font = { bold: true };
    secureWorkbookText(book);
    const bytes = await book.xlsx.writeBuffer();
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(xml.match(/<f>/g)).toHaveLength(1);
    expect(xml).toContain('<f>SUM(B2:B3)</f>');
    const restored = new ExcelJS.Workbook();
    await restored.xlsx.load(bytes);
    labels.forEach((value, index) => {
      const cell = restored.worksheets[0].getCell(index + 1, 1);
      // XML parsing normalizes CR line endings; text remains a shared string.
      expect(cell.value).toBe(value.replace(/\r/g, '\n'));
      expect(cell.type).toBe(ExcelJS.ValueType.String);
      expect(cell.numFmt).toBe('@');
    });
    expect(restored.worksheets[0].getColumn(1).width).toBe(42);
    expect(restored.worksheets[0].getCell('A1').font?.bold).toBe(true);
    expect(restored.worksheets[0].getCell('B2').value).toBe(1);
  });
});
