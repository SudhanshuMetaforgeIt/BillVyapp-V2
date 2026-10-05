import { describe, expect, it } from 'vitest';
import { reportDateRange } from './report-date-ranges';
describe('report calendar presets', () => {
  it.each([
    ['Today', '2026-10-04', '2026-10-04'],
    ['Yesterday', '2026-10-03', '2026-10-03'],
    ['Last 7 Days', '2026-09-28', '2026-10-04'],
    ['Last 30 Days', '2026-09-05', '2026-10-04'],
    ['This Month', '2026-10-01', '2026-10-04'],
    ['Last Month', '2026-09-01', '2026-09-30'],
    ['This Quarter', '2026-10-01', '2026-10-04'],
    ['This Year', '2026-01-01', '2026-10-04'],
  ])('%s preserves inclusive calendar dates', (preset, dateFrom, dateTo) =>
    expect(reportDateRange(preset, '2026-10-04')).toEqual({ dateFrom, dateTo }),
  );
  it('handles leap years and year boundaries', () => {
    expect(reportDateRange('Last Month', '2024-03-01')).toEqual({
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
    });
    expect(reportDateRange('Yesterday', '2026-01-01')).toEqual({
      dateFrom: '2025-12-31',
      dateTo: '2025-12-31',
    });
  });
});
