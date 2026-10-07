import {
  franchiseRegion,
  validateRegionPreferences,
  excelCurrencyFormat,
} from './regional';
describe('Franchise regional settings', () => {
  it('keeps existing franchises in INR', () =>
    expect(franchiseRegion(null).currency).toBe('INR'));
  it('resolves USD settings and an IANA timezone', () =>
    expect(
      franchiseRegion({
        currency: 'USD',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '24',
      }),
    ).toEqual({
      phoneCountry: 'IN',
      currency: 'USD',
      locale: 'en-US',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24',
    }));
  it('rejects unsupported settings', () => {
    for (const p of [
      { currency: 'EUR' },
      { timezone: 'US Somewhere' },
      { dateFormat: 'invalid' },
      { timeFormat: '13' },
    ])
      expect(() => validateRegionPreferences(p)).toThrow();
  });
  it('exports dollars as numeric currency cells', () =>
    expect(excelCurrencyFormat('USD')).toBe('"$"#,##0.00'));
});
