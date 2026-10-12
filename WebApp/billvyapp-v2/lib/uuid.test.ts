import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUuid } from './uuid';
import { financialRequestKey } from './financial-request';

afterEach(() => vi.unstubAllGlobals());

describe('Browser UUID compatibility', () => {
  it('uses the native UUID API when available', () => {
    const randomUUID = vi.fn(() => '12345678-1234-4234-9234-123456789abc');
    vi.stubGlobal('crypto', { randomUUID });
    expect(createUuid()).toBe('12345678-1234-4234-9234-123456789abc');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('generates distinct valid UUIDs and stable financial retries without randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    const ids = Array.from({ length: 100 }, createUuid);
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    const payment = { amount: 50 };
    expect(financialRequestKey(payment)).toBe(financialRequestKey(payment));
    expect(financialRequestKey({ amount: 50 })).not.toBe(financialRequestKey(payment));
  });

  it('fails clearly if cryptographic randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => createUuid()).toThrow('secure request IDs');
  });
});
