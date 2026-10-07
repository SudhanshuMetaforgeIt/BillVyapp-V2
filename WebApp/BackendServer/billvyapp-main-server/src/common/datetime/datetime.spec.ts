import {
  addCalendarDays,
  businessCalendarRangeToUtc,
  businessDayUtcRange,
  calendarDateInTimeZone,
  calendarDateStartUtc,
  DEFAULT_BUSINESS_TIMEZONE,
  formatBillDateApi,
  isDateOnlyString,
  parseDateOnlyUtc,
  resolveBusinessTimezone,
  zonedLocalTimeToUtc,
} from './datetime';

describe('datetime utilities', () => {
  const ist = 'Asia/Kolkata';

  it('defaults timezone resolution to Asia/Kolkata', () => {
    expect(resolveBusinessTimezone({})).toBe(DEFAULT_BUSINESS_TIMEZONE);
  });

  it('prefers franchise timezone over platform', () => {
    expect(
      resolveBusinessTimezone({
        franchiseTimezone: 'Asia/Dubai',
        platformTimezone: 'Asia/Kolkata',
      }),
    ).toBe('Asia/Dubai');
  });

  it('falls back past invalid IANA zones', () => {
    expect(
      resolveBusinessTimezone({
        franchiseTimezone: 'Not/AZone',
        platformTimezone: 'Asia/Kolkata',
      }),
    ).toBe('Asia/Kolkata');
  });

  it('maps IST midnight to the correct UTC instant', () => {
    const range = businessDayUtcRange('2026-10-01', ist);
    expect(range.startUtc.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(range.endUtcExclusive.toISOString()).toBe(
      '2026-10-01T18:30:00.000Z',
    );
  });

  it.each([
    ['2026-03-08', 23],
    ['2026-11-01', 25],
  ])('uses the complete New York business day on %s', (day, hours) => {
    const range = businessDayUtcRange(String(day), 'America/New_York');
    expect(
      (range.endUtcExclusive.getTime() - range.startUtc.getTime()) / 3600000,
    ).toBe(hours);
  });

  it('covers IST 23:59:59.999 inside the half-open day range', () => {
    const range = businessDayUtcRange('2026-10-01', ist);
    const almostEnd = zonedLocalTimeToUtc(ist, 2026, 10, 1, 23, 59, 59, 999);
    expect(almostEnd.getTime()).toBeGreaterThanOrEqual(
      range.startUtc.getTime(),
    );
    expect(almostEnd.getTime()).toBeLessThan(range.endUtcExclusive.getTime());
    expect(almostEnd.toISOString()).toBe('2026-10-01T18:29:59.999Z');
  });

  it('handles month boundary from IST September into October', () => {
    const sep = businessDayUtcRange('2026-09-30', ist);
    const oct = businessDayUtcRange('2026-10-01', ist);
    expect(sep.endUtcExclusive.toISOString()).toBe(oct.startUtc.toISOString());
  });

  it('handles year boundary from IST 2025 into 2026', () => {
    const end = businessDayUtcRange('2025-12-31', ist);
    const start = businessDayUtcRange('2026-01-01', ist);
    expect(end.endUtcExclusive.toISOString()).toBe(
      start.startUtc.toISOString(),
    );
    expect(start.startUtc.toISOString()).toBe('2025-12-31T18:30:00.000Z');
  });

  it('formats a known UTC instant in Asia/Kolkata', () => {
    const instant = new Date('2026-10-01T07:15:00.000Z');
    expect(calendarDateInTimeZone(ist, instant)).toBe('2026-10-01');
  });

  it('does not change the stored instant when display timezone changes', () => {
    const stored = new Date('2026-10-01T07:15:00.000Z');
    const asIso = stored.toISOString();
    expect(calendarDateInTimeZone('Asia/Kolkata', stored)).toBe('2026-10-01');
    expect(calendarDateInTimeZone('Asia/Dubai', stored)).toBe('2026-10-01');
    expect(stored.toISOString()).toBe(asIso);
  });

  it('builds inclusive multi-day ranges as half-open UTC bounds', () => {
    const range = businessCalendarRangeToUtc('2026-10-01', '2026-10-03', ist);
    expect(range.gte?.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(range.lt?.toISOString()).toBe('2026-10-03T18:30:00.000Z');
  });

  it('validates date-only labels without timezone shifting', () => {
    expect(isDateOnlyString('2026-10-01')).toBe(true);
    expect(isDateOnlyString('2026-13-01')).toBe(false);
    expect(addCalendarDays('2026-10-01', 1)).toBe('2026-10-02');
  });

  it('stores business calendar start as the IST midnight UTC instant', () => {
    expect(calendarDateStartUtc('2026-10-01', ist).toISOString()).toBe(
      '2026-09-30T18:30:00.000Z',
    );
  });

  it('stores billDate as UTC midnight of the YYYY-MM-DD label', () => {
    expect(parseDateOnlyUtc('2026-10-01').toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('serializes billDate YYYY-MM-DD without browser-style shifting', () => {
    const canonical = parseDateOnlyUtc('2026-10-01');
    expect(formatBillDateApi(canonical, 'America/New_York')).toBe('2026-10-01');
    expect(formatBillDateApi(canonical, 'Asia/Kolkata')).toBe('2026-10-01');
  });

  it('decodes Phase-2 business-day-start billDate sentinels via business TZ', () => {
    const legacy = calendarDateStartUtc('2026-10-01', ist);
    expect(formatBillDateApi(legacy, ist)).toBe('2026-10-01');
    expect(formatBillDateApi(legacy, 'America/New_York')).not.toBe(
      formatBillDateApi(legacy, ist),
    );
  });
});
