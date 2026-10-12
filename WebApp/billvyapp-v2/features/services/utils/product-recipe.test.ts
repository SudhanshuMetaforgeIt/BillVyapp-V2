import { describe, expect, it } from 'vitest';
import { validProductRecipe } from './product-recipe';

describe('Service product recipe validation', () => {
  const row = { productId: 'shampoo', mode: 'PERCENT' as const, value: 5 };
  it('allows services with no consumables and valid percent/fixed recipes', () => {
    expect(validProductRecipe([])).toBe(true);
    expect(validProductRecipe([row, { productId: 'conditioner', mode: 'FIXED', value: 25 }])).toBe(true);
  });
  it.each([0, -5, 101, Number.NaN, Number.POSITIVE_INFINITY, 0.00001, 1.12345])('rejects percentage %s before submission', (value) => {
    expect(validProductRecipe([{ ...row, value }])).toBe(false);
  });
  it('rejects repeated, missing and excessive products', () => {
    expect(validProductRecipe([row, row])).toBe(false);
    expect(validProductRecipe([{ ...row, productId: '' }])).toBe(false);
    expect(validProductRecipe(Array.from({ length: 31 }, (_, i) => ({ ...row, productId: String(i) })))).toBe(false);
  });
});
