import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { AdminReportSnapshot } from './admin-report-data';

export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const currency = '"₹"#,##0.00';
const dateFormat = 'dd mmm yyyy';
const periodLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
const xml = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  );
export function adminReportFileName(
  s: Pick<AdminReportSnapshot, 'branchId' | 'branch' | 'dateFrom' | 'dateTo'>,
) {
  const branch = s.branchId
    ? `_${
        s.branch
          .normalize('NFKD')
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 60) || 'Branch'
      }`
    : '_Report';
  return `BillVyApp_Overview${branch}_${s.dateFrom}_to_${s.dateTo}.xlsx`;
}

type Value = string | number | Date | null;
type ChartSpec = {
  sheet: number;
  name: string;
  title: string;
  type: 'line' | 'bar';
  labels: Value[];
  values: number[];
  categoryColumn: string;
  valueColumn: string;
};

// ExcelJS writes typed cells/tables. DrawingML parts add native, editable charts
// following the OOXML chart/drawing relationship model; no raster images are used.
async function addCharts(buffer: Buffer, specs: ChartSpec[]) {
  const zip = await JSZip.loadAsync(buffer);
  let contentTypes = await zip.file('[Content_Types].xml')!.async('string');
  for (const [index, s] of specs.entries()) {
    if (!s.labels.length) continue;
    const n = index + 1;
    const first = 6,
      last = first + s.labels.length - 1;
    const ref = (column: string) =>
      xml(
        `'${s.name.replace(/'/g, "''")}'!$${column}$${first}:$${column}$${last}`,
      );
    const dateCategories = s.labels[0] instanceof Date;
    const labels = s.labels.map((value) =>
      value instanceof Date
        ? value.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          })
        : value,
    );
    const cache = (values: Value[]) =>
      `<c:ptCount val="${values.length}"/>${values.map((value, i) => `<c:pt idx="${i}"><c:v>${xml(value)}</c:v></c:pt>`).join('')}`;
    const cat = `<c:strRef><c:f>${ref(s.categoryColumn)}</c:f><c:strCache>${cache(labels)}</c:strCache></c:strRef>`;
    const ser = `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Revenue</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="C5A46D"/></a:solidFill><a:ln w="28575"><a:solidFill><a:srgbClr val="C5A46D"/></a:solidFill></a:ln></c:spPr>${s.type === 'line' ? '<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>' : ''}<c:cat>${cat}</c:cat><c:val><c:numRef><c:f>${ref(s.valueColumn)}</c:f><c:numCache><c:formatCode>${currency}</c:formatCode>${cache(s.values)}</c:numCache></c:numRef></c:val></c:ser>`;
    const chartType =
      s.type === 'line'
        ? `<c:lineChart><c:grouping val="standard"/>${ser}<c:axId val="100"/><c:axId val="200"/></c:lineChart>`
        : `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>${ser}<c:gapWidth val="80"/><c:axId val="100"/><c:axId val="200"/></c:barChart>`;
    zip.file(
      `xl/charts/chart${n}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:date1904 val="0"/><c:lang val="en-IN"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-IN"/><a:t>${xml(s.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/>${chartType}<c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:numFmt formatCode="${dateCategories ? dateFormat : 'General'}" sourceLinked="1"/><c:tickLblPos val="nextTo"/><c:crossAx val="200"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="${xml(currency)}" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="100"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:plotVisOnly val="0"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`,
    );
    zip.file(
      `xl/drawings/drawing${n}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>17</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>22</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${n + 1}" name="${xml(s.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdChart"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`,
    );
    zip.file(
      `xl/drawings/_rels/drawing${n}.xml.rels`,
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${n}.xml"/></Relationships>`,
    );
    const path = `xl/worksheets/sheet${s.sheet}.xml`;
    const sheetXml = await zip.file(path)!.async('string');
    const drawing = '<drawing r:id="rIdNativeChart"/>';
    zip.file(
      path,
      sheetXml.includes('<tableParts')
        ? sheetXml.replace('<tableParts', `${drawing}<tableParts`)
        : sheetXml.replace('</worksheet>', `${drawing}</worksheet>`),
    );
    const relPath = `xl/worksheets/_rels/sheet${s.sheet}.xml.rels`;
    const rels = zip.file(relPath)
      ? await zip.file(relPath)!.async('string')
      : '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    zip.file(
      relPath,
      rels.replace(
        '</Relationships>',
        `<Relationship Id="rIdNativeChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`,
      ),
    );
    contentTypes = contentTypes.replace(
      '</Types>',
      `<Override PartName="/xl/charts/chart${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`,
    );
  }
  zip.file('[Content_Types].xml', contentTypes);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function buildAdminWorkbook(
  s: AdminReportSnapshot,
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = 'BillVyApp';
  book.created = new Date(s.generatedOn);
  const sheets: ExcelJS.Worksheet[] = [];
  const table = (
    name: string,
    headers: string[],
    rows: Value[][],
    formats: Record<number, string> = {},
  ) => {
    const ws = book.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
      properties: { defaultRowHeight: 22 },
    });
    sheets.push(ws);
    ws.mergeCells(1, 1, 1, Math.max(2, headers.length));
    ws.getCell('A1').value = `BillVyApp — ${name}`;
    ws.getCell('A1').font = {
      name: 'Arial',
      size: 16,
      bold: true,
      color: { argb: 'FF35507A' },
    };
    ws.getRow(1).height = 32;
    ws.getCell('A2').value = `${s.dateFrom} to ${s.dateTo} · ${s.branch}`;
    ws.getCell('A3').value = rows.length
      ? null
      : 'No data available for the selected period.';
    ws.columns = headers.map((_, i) => ({ width: i === 0 ? 30 : 24 }));
    if (rows.length)
      ws.addTable({
        name: `ReportTable${sheets.length}`,
        ref: 'A5',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium9', showRowStripes: true },
        columns: headers.map((name) => ({ name, filterButton: true })),
        rows,
      });
    else {
      ws.getRow(5).values = headers;
      ws.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5, column: headers.length },
      };
    }
    ws.getRow(5).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF35507A' },
      };
    });
    ws.getRow(5).height = 28;
    for (const [column, format] of Object.entries(formats))
      ws.getColumn(Number(column)).numFmt = format;
    ws.eachRow((row) => {
      let lines = 1;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (row.number !== 1) {
          cell.font = {
            name: 'Arial',
            size: 11,
            ...(row.number === 5
              ? { bold: true, color: { argb: 'FFFFFFFF' } }
              : {}),
          };
          if (typeof cell.value === 'string')
            lines = Math.max(
              lines,
              Math.ceil(
                cell.value.length /
                  Math.max(8, (ws.getColumn(cell.col).width ?? 24) - 2),
              ),
            );
        }
      });
      if (row.number !== 1 && row.number !== 5)
        row.height = Math.min(409, Math.max(22, lines * 15 + 6));
    });
    return ws;
  };
  const summary = table(
    'Executive Summary',
    ['Metric', 'Value'],
    [
      ['Report', 'Franchise Report'],
      ['Report Type', 'Overview'],
      ['Date Range', `${s.dateFrom} to ${s.dateTo}`],
      ['Branch', s.branch],
      ['Generated On', new Date(s.generatedOn)],
      ['Generated By', s.generatedBy],
      ['Business Timezone', s.timeZone],
      ['Total Revenue', s.stats.totalRevenue],
      ['Total Bills', s.stats.totalBills],
      ['Total Customers', s.stats.totalCustomers],
      ['Total Services', s.stats.totalServices],
      ['Total Staff', s.stats.totalStaff],
      ['Successful Payments', s.payments.successful],
      ['Failed Payments', s.payments.failed],
      ['Payment Success Rate', s.payments.successRate],
      [
        'Average Bill Value',
        s.bills.filter((b) => b.status === 'COMPLETED').length
          ? s.bills
              .filter((b) => b.status === 'COMPLETED')
              .reduce((sum, b) => sum + b.total, 0) /
            s.bills.filter((b) => b.status === 'COMPLETED').length
          : null,
      ],
      [
        'Activity',
        s.bills.length
          ? 'Data available for selected period'
          : 'No data available for the selected period.',
      ],
      [
        'Revenue definition',
        'Collected amount on completed bills dated in this range.',
      ],
      [
        'Bill count definition',
        'All bill statuses in the selected period. Draft and cancelled bills do not contribute revenue.',
      ],
      [
        'Population definition',
        'Customers with bill history in this scope; current service catalogue and Admin/Manager/Staff accounts.',
      ],
      [
        'Payment definition',
        'Payment records attached to completed bills dated in this range; includes split payments.',
      ],
    ],
  );
  summary.getColumn(2).width = 65;
  summary.getCell('B10').numFmt = 'dd mmm yyyy hh:mm';
  summary.getCell('B13').numFmt = currency;
  summary.getCell('B20').numFmt = '0.00%';
  summary.getCell('B21').numFmt = currency;
  const revenueSheet = table(
    'Revenue Analysis',
    ['Date / Period', 'Revenue', 'Bills', 'Average Bill Value'],
    s.revenueSeries.map((r) => [
      new Date(`${r.date}T00:00:00Z`),
      r.revenue,
      r.bills,
      r.averageBillValue,
    ]),
    { 1: dateFormat, 2: currency, 4: currency },
  );
  // Date cells remain typed. Formula-backed category labels avoid serial-number
  // labels in spreadsheet viewers and update when the source date is edited.
  revenueSheet.getCell('F5').value = 'Chart period';
  s.revenueSeries.forEach((r, index) => {
    revenueSheet.getCell(`F${index + 6}`).value = {
      formula: `TEXT(A${index + 6},"dd mmm yyyy")`,
      result: periodLabel(r.date),
    };
  });
  revenueSheet.getColumn('F').hidden = true;
  book.calcProperties.fullCalcOnLoad = true;
  table(
    'Bills - Transactions',
    [
      'Bill Number',
      'Date',
      'Branch',
      'Customer',
      'Subtotal',
      'Discount',
      'Tax',
      'Total',
      'Collected',
      'Bill Status',
      'Payment Status',
      'Payment Method',
    ],
    s.bills.map((b) => [
      b.billNumber,
      new Date(`${b.date}T00:00:00Z`),
      b.branch,
      b.customer,
      b.subtotal,
      b.discount,
      b.tax,
      b.total,
      b.collected,
      b.status,
      b.paymentStatus,
      b.paymentMethods,
    ]),
    {
      2: dateFormat,
      5: currency,
      6: currency,
      7: currency,
      8: currency,
      9: currency,
    },
  );
  table(
    'Branch Performance',
    ['Branch', 'Bills', 'Revenue', 'Customers', 'Average Bill Value'],
    s.branchComparison.map((b) => [
      b.name,
      b.bills,
      b.revenue,
      b.customers,
      b.averageBillValue,
    ]),
    { 3: currency, 5: currency },
  );
  table(
    'Customer Summary',
    ['Customer', 'Bills', 'Revenue', 'Average Bill Value', 'Last Visit'],
    s.customers.map((c) => [
      c.name,
      c.bills,
      c.revenue,
      c.averageBillValue,
      new Date(`${c.lastVisit}T00:00:00Z`),
    ]),
    { 3: currency, 4: currency, 5: dateFormat },
  );
  table(
    'Payment Methods',
    ['Payment Method', 'Revenue', 'Successful Payments'],
    s.payments.methods.map((p) => [p.name, p.revenue, p.payments]),
    { 2: currency },
  );
  table(
    'Services',
    ['Service', 'Quantity', 'Revenue'],
    [...s.services]
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => [p.name, p.quantity, p.revenue]),
    { 3: currency },
  );
  return addCharts(Buffer.from(await book.xlsx.writeBuffer()), [
    {
      sheet: 2,
      name: 'Revenue Analysis',
      title: 'Revenue Trend',
      type: 'line',
      labels: s.revenueSeries.map((r) => periodLabel(r.date)),
      values: s.revenueSeries.map((r) => r.revenue),
      categoryColumn: 'F',
      valueColumn: 'B',
    },
    {
      sheet: 4,
      name: 'Branch Performance',
      title: 'Branch Revenue Comparison',
      type: 'bar',
      labels: s.branchComparison.map((r) => r.name),
      values: s.branchComparison.map((r) => r.revenue),
      categoryColumn: 'A',
      valueColumn: 'C',
    },
    {
      sheet: 5,
      name: 'Customer Summary',
      title: 'Top Customers by Collected Revenue',
      type: 'bar',
      labels: s.customers.slice(0, 10).map((r) => r.name),
      values: s.customers.slice(0, 10).map((r) => r.revenue),
      categoryColumn: 'A',
      valueColumn: 'C',
    },
    {
      sheet: 6,
      name: 'Payment Methods',
      title: 'Revenue by Payment Method',
      type: 'bar',
      labels: s.payments.methods.map((r) => r.name),
      values: s.payments.methods.map((r) => r.revenue),
      categoryColumn: 'A',
      valueColumn: 'B',
    },
  ]);
}
