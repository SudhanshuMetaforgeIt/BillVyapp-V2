import { afterEach, describe, expect, it, vi } from 'vitest';
let region = {
  currency: 'USD',
  locale: 'en-US',
  dateFormat: 'MM/DD/YYYY',
  hour12: false,
};
vi.mock('@/lib/business-region', () => ({ getBusinessRegion: () => region }));
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatDateTime,
  formatTime,
} from './format';
afterEach(() => {
  region = {
    currency: 'USD',
    locale: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    hour12: false,
  };
});
describe('Regional display', () => {
  it('formats USD with cents and US grouping', () =>
    expect(formatCurrency('1234567.89')).toBe('$1,234,567.89'));
  it('uses millions for USD charts', () =>
    expect(formatCompactCurrency(1000000)).toBe('$1M'));
  it('preserves Indian defaults', () => {
    region = {
      currency: 'INR',
      locale: 'en-IN',
      dateFormat: 'DD MMM YYYY',
      hour12: true,
    };
    expect(formatCurrency(1234567.89)).toBe('₹12,34,567.89');
    expect(formatCompactCurrency(1000000)).toBe('₹10L');
  });
  it('keeps calendar dates and uses selected formats', () => {
    expect(formatDate('2026-10-01')).toBe('10/01/2026');
    region.dateFormat = 'YYYY-MM-DD';
    expect(formatDate('2026-10-01')).toBe('2026-10-01');
    expect(formatTime('17:30')).toBe('17:30');
  });
  it('observes New York summer and winter offsets', () => {
    expect(formatDateTime('2026-07-01T16:00:00Z', 'America/New_York')).toBe(
      '07/01/2026, 12:00',
    );
    expect(formatDateTime('2026-12-01T16:00:00Z', 'America/New_York')).toBe(
      '12/01/2026, 11:00',
    );
  });
});
