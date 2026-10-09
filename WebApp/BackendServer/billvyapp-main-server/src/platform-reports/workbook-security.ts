import type ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

/** Untrusted labels stay text. Trusted formula objects and numeric values are preserved. */
export function secureWorkbookText(book: ExcelJS.Workbook): void {
  let cells = 0;
  book.eachSheet((sheet) =>
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        if (++cells > 1_000_000)
          throw new BadRequestException(
            'Report exceeds the workbook cell limit; select a narrower scope',
          );
        if (typeof cell.value === 'string') {
          if (cell.value.length > 32767)
            throw new BadRequestException(
              'Report text exceeds the spreadsheet cell limit',
            );
          if (
            /^[\s\uFEFF]*[=+@-]/u.test(cell.value) ||
            /^[\t\r\n]/.test(cell.value)
          ) {
            // ExcelJS serializes strings as OOXML shared strings, never formula nodes.
            // Keep the exact label and explicitly mark formula-leading text as text.
            cell.numFmt = '@';
          }
        }
      }),
    ),
  );
}
