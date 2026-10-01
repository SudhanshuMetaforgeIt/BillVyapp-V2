import { describe, expect, it, beforeEach } from 'vitest';

import {
  DEFAULT_BUSINESS_TIMEZONE,
  calendarDateInTimeZone,
  getBusinessTimezone,
  isDateOnlyString,
  resolveBusinessTimezone,
  setBusinessTimezone,
} from './business-timezone';
import { formatDate, formatDateTime, formatTime } from './format';

describe('business timezone formatting', () => {
  beforeEach(() => {
    setBusinessTimezone('Asia/Kolkata');
  });

  it('resolves franchise → platform → Asia/Kolkata', () => {
    expect(
      resolveBusinessTimezone({
        franchiseTimezone: 'Asia/Dubai',
        platformTimezone: 'UTC',
      }),
    ).toBe('Asia/Dubai');
    expect(resolveBusinessTimezone({ platformTimezone: 'UTC' })).toBe('UTC');
    expect(resolveBusinessTimezone({})).toBe(DEFAULT_BUSINESS_TIMEZONE);
  });

  it('formats a known UTC instant in Asia/Kolkata', () => {
    const instant = '2026-10-01T07:15:00.000Z';
    expect(formatDateTime(instant, 'Asia/Kolkata')).toBe('01 Oct 2026, 12:45 PM');
    expect(formatDate(instant, 'Asia/Kolkata')).toBe('01 Oct 2026');
    expect(formatTime(instant, 'Asia/Kolkata')).toBe('12:45 PM');
  });

  it('keeps date-only values unshifted regardless of browser-like zones', () => {
    expect(isDateOnlyString('2026-10-01')).toBe(true);
    expect(formatDate('2026-10-01', 'America/New_York')).toBe('01 Oct 2026');
    expect(formatDateTime('2026-10-01', 'America/New_York')).toBe('01 Oct 2026');
  });

  it('passes appointment HH:mm:ss through without timezone conversion', () => {
    expect(formatTime('10:30:00')).toBe('10:30 AM');
    expect(formatTime('22:15')).toBe('10:15 PM');
  });

  it('does not change the stored instant when display timezone changes', () => {
    const stored = '2026-10-01T07:15:00.000Z';
    const before = stored;
    expect(formatDateTime(stored, 'Asia/Kolkata')).toContain('12:45');
    expect(formatDateTime(stored, 'Asia/Dubai')).toContain('11:15');
    expect(stored).toBe(before);
  });

  it('keeps billDate YYYY-MM-DD unshifted by browser-like zones', () => {
    expect(formatDate('2026-10-01', 'America/Los_Angeles')).toBe('01 Oct 2026');
    expect(formatDateTime('2026-10-01', 'America/Los_Angeles')).toBe(
      '01 Oct 2026',
    );
  });

  it('uses module business timezone by default', () => {
    setBusinessTimezone('Asia/Kolkata');
    expect(getBusinessTimezone()).toBe('Asia/Kolkata');
    expect(
      calendarDateInTimeZone(
        'Asia/Kolkata',
        new Date('2026-10-01T07:15:00.000Z'),
      ),
    ).toBe('2026-10-01');
  });
});
