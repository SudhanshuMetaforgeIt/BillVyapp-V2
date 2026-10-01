import { describe, expect, it, beforeEach } from 'vitest';

import {
  businessCalendarDateOfInstant,
  businessMonthToDate,
  businessToday,
  businessWeekRange,
  isInstantOnBusinessDay,
} from './business-calendar';
import {
  setBusinessTimezone,
  todayBusinessDateOnly,
} from './business-timezone';

describe('business calendar helpers', () => {
  beforeEach(() => {
    setBusinessTimezone('Asia/Kolkata');
  });

  it('treats business today as Asia/Kolkata calendar day', () => {
    expect(businessToday()).toBe(todayBusinessDateOnly('Asia/Kolkata'));
  });

  it('classifies an instant on the IST business day boundary', () => {
    // 2026-09-30T18:30:00Z is midnight IST on 2026-10-01
    const instant = '2026-09-30T18:30:00.000Z';
    expect(businessCalendarDateOfInstant(instant, 'Asia/Kolkata')).toBe(
      '2026-10-01',
    );
    expect(isInstantOnBusinessDay(instant, '2026-10-01', 'Asia/Kolkata')).toBe(
      true,
    );
    expect(isInstantOnBusinessDay(instant, '2026-09-30', 'Asia/Kolkata')).toBe(
      false,
    );
  });

  it('keeps month-to-date labels as date-only values', () => {
    const range = businessMonthToDate('Asia/Kolkata');
    expect(range.dateFrom).toMatch(/^\d{4}-\d{2}-01$/);
    expect(range.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.dateFrom <= range.dateTo).toBe(true);
  });

  it('returns a Monday–Sunday week range of date-only labels', () => {
    const week = businessWeekRange('Asia/Kolkata');
    expect(week.dateFrom <= week.dateTo).toBe(true);
    const [y, m, d] = week.dateFrom.split('-').map(Number);
    expect(new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()).toBe(1);
  });
});
