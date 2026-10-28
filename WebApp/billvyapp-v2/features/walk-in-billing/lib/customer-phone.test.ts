import { describe, expect, it } from 'vitest';
import { customerPhoneInputSchema, customerPhoneSchema, customerPhoneSearchSchema } from './customer-phone';

describe('Walk-in customer phone pre-check', () => {
  it.each(['96857485965', '9685748596524163', '+9196857485965', '+121255501234', '968abc1234'])('rejects invalid input %s without truncating it', value => {
    expect(customerPhoneInputSchema.safeParse(value).success).toBe(false);
    expect(customerPhoneSearchSchema.safeParse(value).success).toBe(false);
    expect(customerPhoneSchema.safeParse(value).success).toBe(false);
  });

  it.each(['9685748596', '+919685748596', '+12125550123'])('accepts complete phone %s', value => {
    expect(customerPhoneSchema.parse(value)).toBe(value);
    expect(customerPhoneSearchSchema.parse(value)).toBe(value);
  });

  it('allows partial searches but requires a full number for customer creation', () => {
    expect(customerPhoneSearchSchema.parse('968')).toBe('968');
    expect(customerPhoneSchema.safeParse('968').success).toBe(false);
    expect(customerPhoneSearchSchema.safeParse('96').success).toBe(false);
  });

  it.each(['', '+', '+9', '+91', '+1'])('allows editing partial input %s', value => {
    expect(customerPhoneInputSchema.parse(value)).toBe(value);
  });

  it('accepts formatting and preserves country codes', () => {
    expect(customerPhoneSchema.parse('+91 96857-48596')).toBe('+919685748596');
  });
});
