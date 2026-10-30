import { describe, expect, it } from 'vitest';
import { analyticsRowKey } from './analytics-row-key';

describe('Report aggregate row identity', () => {
  const service = { id: 'a20e4755-1411-488d-8860-41f96e7b29a6', franchiseId: 'business', salonId: 'branch', gender: 'MALE', revenue: 100 };

  it('keeps separate customer-gender rows for the same service', () => {
    const rows = ['MALE', 'FEMALE', 'OTHER', 'UNISEX'].map(gender => ({ ...service, gender }));
    expect(new Set(rows.map(analyticsRowKey)).size).toBe(rows.length);
  });

  it('distinguishes the same ID in different business and branch groups', () => {
    const rows = [service, { ...service, salonId: 'other-branch' }, { ...service, franchiseId: 'other-business' }];
    expect(new Set(rows.map(analyticsRowKey)).size).toBe(rows.length);
  });

  it('preserves identity when rankings reorder or totals refresh', () => {
    expect(analyticsRowKey(service, 0)).toBe(analyticsRowKey({ ...service, revenue: 999 }, 12));
  });

  it('retains support for ungrouped IDs and summary rows without IDs', () => {
    expect(analyticsRowKey({ id: 'report' }, 0)).toBe(analyticsRowKey({ id: 'report' }, 1));
    expect(analyticsRowKey({}, 0)).not.toBe(analyticsRowKey({}, 1));
  });
});
