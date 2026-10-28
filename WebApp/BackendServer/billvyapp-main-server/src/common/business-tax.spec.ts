import { validate } from 'class-validator';
import { businessTaxRate } from './business-tax';
import { FranchisePreferencesDto } from '../franchises/dto/franchise-preferences.dto';

describe('Business service tax', () => {
  it.each([0, 5, 12.5, 18, 99.99, 100])('accepts %s percent', async rate => {
    const dto = Object.assign(new FranchisePreferencesDto(), { defaultTaxRate: rate });
    expect(await validate(dto)).toHaveLength(0);
    expect(businessTaxRate(dto)).toBe(rate);
  });

  it.each([-1, 100.01, 1.234, '18', NaN, Infinity])('rejects invalid rate %s', async rate => {
    const dto = Object.assign(new FranchisePreferencesDto(), { defaultTaxRate: rate });
    expect((await validate(dto)).some(error => error.property === 'defaultTaxRate')).toBe(true);
    expect(() => businessTaxRate(dto)).toThrow();
  });

  it('defaults to zero only when the business has no configured rate', () => {
    expect(businessTaxRate(null)).toBe(0);
    expect(businessTaxRate({})).toBe(0);
    expect(businessTaxRate({ defaultTaxRate: 0 })).toBe(0);
  });
});
