import { describe, expect, it } from 'vitest';

import {
  loginSchema,
  normalizeIndianPhone,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from './auth.schema';

describe('auth schemas', () => {
  it('accepts staff email/password login', () => {
    const parsed = loginSchema.parse({
      email: 'manager@salon.test',
      phone: '',
      password: 'secret12',
    });
    expect(parsed.email).toBe('manager@salon.test');
  });

  it('normalises Indian numbers for OTP', () => {
    expect(normalizeIndianPhone('+91 9966996688')).toBe('+919966996688');
    expect(sendOtpSchema.parse({ phone: '9966996688' }).phone).toBe(
      '9966996688',
    );
  });

  it('requires a 6-digit code and maps to backend otp field at the call site', () => {
    const values = verifyOtpSchema.parse({
      phone: '9966996688',
      code: '123456',
    });
    const payload = { phone: values.phone, otp: values.code };
    expect(payload).toEqual({ phone: '9966996688', otp: '123456' });
    expect(
      verifyOtpSchema.safeParse({ phone: '9966996688', code: '12' }).success,
    ).toBe(false);
  });

  it('rejects registration passwords that do not match', () => {
    const result = registerSchema.safeParse({
      firstName: 'Pat',
      lastName: 'Customer',
      email: 'pat@test.com',
      phone: '9966996688',
      password: 'password1',
      confirmPassword: 'password2',
    });
    expect(result.success).toBe(false);
  });
});
