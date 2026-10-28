import { describe, expect, it } from 'vitest';
import { franchisePreferencesPatch } from './franchise-preferences';
import { getRequestSchema, validateRequestInput, validationError } from '@/lib/validation/request-validation';

const id = '11111111-1111-4111-8111-111111111111';
const stored = {
  defaultTaxRate: 5, billPrint: true,
  currency: 'INR', phoneCountry: 'IN', language: 'en',
  dateFormat: 'DD MMM YYYY', timeFormat: '12', timezone: 'Asia/Kolkata',
  acceptCash: true, acceptUpi: false, acceptCard: true,
  emailNotifications: true, smsNotifications: false, lowStockAlert: true,
  walkInCustomerRequired: false, autoBackup: true,
  loyalty: { enabled: true, minimumRedeemPoints: 10 },
  legacySetting: 'preserved on the server',
};

describe('Franchise settings save payloads', () => {
  it('reproduces the reported error when stored preference fields are sent back', () => {
    const result = getRequestSchema('UpdateFranchiseDto').safeParse({ preferences: stored });
    expect(result.success).toBe(false);
    if (!result.success) expect(validationError(result.error).message).toContain('Some submitted fields are not allowed');
  });

  it.each([0, 5, 12.5, 100])('saves billing rate %s through the existing API with only billing fields', rate => {
    const payload = franchisePreferencesPatch('billing', { ...stored, defaultTaxRate: rate });
    expect(payload).toEqual({ preferences: { defaultTaxRate: rate, billPrint: true } });
    expect(validateRequestInput('PATCH', `/franchises/${id}`, payload, 'body')).toEqual(payload);
  });

  it.each(['general', 'payments', 'notifications', 'security'])('saves %s without resubmitting unrelated settings', section => {
    const payload = franchisePreferencesPatch(section, stored);
    expect(payload.preferences).not.toHaveProperty('loyalty');
    expect(payload.preferences).not.toHaveProperty('defaultTaxRate');
    expect(validateRequestInput('PATCH', `/franchises/${id}`, payload, 'body')).toEqual(payload);
  });

  it.each([-1, 100.01, 1.234])('rejects invalid billing tax %s', rate => {
    const payload = franchisePreferencesPatch('billing', { ...stored, defaultTaxRate: rate });
    expect(() => validateRequestInput('PATCH', `/franchises/${id}`, payload, 'body')).toThrow();
  });
});
