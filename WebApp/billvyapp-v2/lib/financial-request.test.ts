import { describe, expect, it } from 'vitest';
import { financialRequest, financialRequestKey } from './financial-request';

describe('Financial submission identity', () => {
  it('reuses the request key on a transport or mutation retry', () => {
    const input = { amount: 50 };
    expect(financialRequest(input).idempotencyKey).toBe(financialRequest(input).idempotencyKey);
    expect(financialRequest({ amount: 50 }).idempotencyKey).not.toBe(financialRequest(input).idempotencyKey);
  });
  it('preserves an explicit workflow key across the draft and payment steps', () => {
    expect(financialRequestKey({ idempotencyKey: 'saved-workflow' })).toBe('saved-workflow');
    expect(financialRequest({ idempotencyKey: 'saved-payment', amount: 50 })).toEqual({ idempotencyKey: 'saved-payment', amount: 50 });
  });
});
