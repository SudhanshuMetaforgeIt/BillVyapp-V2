import { describe, expect, it, vi } from 'vitest';
vi.mock('./business-region', () => ({
  getBusinessRegion: () => ({ phoneCountry: 'US' }),
}));
import {
  normalizePhone,
  cleanPhoneInput,
  isValidPhoneInput,
  maskPhone,
} from './phone';
describe('Inherited phone defaults', () => {
  it('adds the inherited calling code only to local numbers', () => {
    expect(normalizePhone('2125550123')).toBe('+12125550123');
    expect(normalizePhone('+919876543210')).toBe('+919876543210');
  });
  it('supports quick local input and keeps full international numbers', () => {
    expect(isValidPhoneInput('2125550123')).toBe(true);
    expect(isValidPhoneInput('+12125550123')).toBe(true);
    expect(isValidPhoneInput('123')).toBe(false);
  });
  it('preserves incomplete searches without truncation', () => {
    expect(cleanPhoneInput('212')).toBe('212');
    expect(cleanPhoneInput('+1 (212) 555-0123')).toBe('+12125550123');
    expect(cleanPhoneInput('1234567890123456')).toBe('1234567890123456');
  });
  it('masks the number without guessing +91', () =>
    expect(maskPhone('+12125550123')).toBe('+1 ••••••0123'));
});
