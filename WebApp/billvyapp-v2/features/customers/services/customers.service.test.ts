import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { fetchCustomersPage } from './customers.service';
import type { CustomerApiItem } from '../types/customers.types';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('@/lib/business-region', () => ({
  getBusinessRegion: () => ({
    currency: 'INR', locale: 'en-IN', dateFormat: 'DD MMM YYYY',
  }),
}));

const customer: CustomerApiItem = {
  id: 'customer', userId: 'user', customerCode: 'CUST-123',
  firstName: 'Test', lastName: 'Customer', email: 'customer@example.com',
  phone: '+919876543210', profilePhoto: null, dateOfBirth: null,
  gender: null, isActive: true, createdAt: '2026-10-01', updatedAt: '2026-10-01',
};
const params = {
  page: 1, limit: 10, search: '', gender: '' as const,
  status: 'all' as const, membershipPlanId: '',
};

function respondWith(customers: CustomerApiItem[]) {
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data: url === '/customers' ? customers : [],
    meta: { page: 1, limit: 10, total: url === '/customers' ? customers.length : 0, totalPages: 1 },
  }));
}

beforeEach(() => vi.resetAllMocks());

describe('customer table visit and spending statistics', () => {
  it('displays the scoped statistics returned by the customer API', async () => {
    respondWith([{ ...customer, totalBills: 12, totalSpent: '12450.75', lastVisit: '2026-10-17' }]);
    const { rows } = await fetchCustomersPage(params);
    expect(rows[0].totalVisitsLabel).toBe('12');
    expect(rows[0].totalSpendLabel).toBe('₹12,450.75');
    expect(rows[0].lastVisitLabel).toBe('17 Oct 2026');
    expect(vi.mocked(api.get).mock.calls.every(([url]) => url !== '/bills')).toBe(true);
  });

  it('shows zero visits and zero spending for a customer with no bills', async () => {
    respondWith([{ ...customer, totalBills: 0, totalSpent: '0.00', lastVisit: null }]);
    const { rows } = await fetchCustomersPage(params);
    expect(rows[0].totalVisitsLabel).toBe('0');
    expect(rows[0].totalSpendLabel).toBe('₹0.00');
    expect(rows[0].lastVisitLabel).toBe('—');
  });

  it('keeps unavailable statistics distinct from actual zero values', async () => {
    respondWith([{ ...customer, lastVisit: 'invalid-date' }]);
    const { rows } = await fetchCustomersPage(params);
    expect(rows[0].totalVisitsLabel).toBe('—');
    expect(rows[0].totalSpendLabel).toBe('—');
    expect(rows[0].lastVisitLabel).toBe('—');
  });
});
