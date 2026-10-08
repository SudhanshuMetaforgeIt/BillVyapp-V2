import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { fetchManagerDashboard } from './dashboard.service';
import type { BillListItem } from '../types/dashboard.types';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('@/lib/business-calendar', () => ({
  businessToday: () => '2026-10-08', businessYesterday: () => '2026-10-07',
}));

beforeEach(() => vi.resetAllMocks());

describe('Manager dashboard after a refund', () => {
  it('excludes refunded and cancelled bills from sales charts, average bill and top services', async () => {
    const bill = (id: string, status: string, amount: string): BillListItem => ({
      id, status, salonId: 'salon', customerId: 'customer', billNumber: id,
      billDate: '2026-10-08', total: amount, paidAmount: amount, dueAmount: status === 'COMPLETED' ? '0.00' : amount,
      paymentStatus: status === 'REFUNDED' ? 'REFUNDED' : 'PAID',
      createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z',
      items: [{ id: `item-${id}`, itemType: 'SERVICE', serviceId: id, productId: null,
        description: id, quantity: 1, total: amount }],
    });
    const completed = bill('completed-service', 'COMPLETED', '100.00');
    const refunded = bill('refunded-service', 'REFUNDED', '3650.00');
    const cancelled = bill('cancelled-service', 'CANCELLED', '200.00');
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      let rows: unknown[] = [];
      if (url === '/bills') {
        rows = config?.params?.dateFrom === '2026-10-07'
          ? [] : [completed, refunded, cancelled];
      } else if (url === '/payments') {
        rows = [{ id: 'payment', amount: '100.00', paymentMethod: 'CASH' }];
      }
      return { data: rows, meta: { page: 1, limit: 100, total: rows.length, totalPages: 1 } } as never;
    });
    const data = await fetchManagerDashboard();
    const metric = (id: string) => data.metrics.find((row) => row.id === id)?.rawValue;
    expect(metric('manager-today-sales')).toBe(100);
    expect(metric('manager-walk-ins')).toBe(1);
    expect(metric('manager-avg-bill')).toBe(100);
    expect(metric('manager-pending-collection')).toBe(0);
    expect(data.salesSeries.reduce((sum, row) => sum + row.thisWeek, 0)).toBe(100);
    expect(data.topServices.map((row) => row.id)).toEqual(['completed-service']);
    expect(data.paymentMethodsTotal).toBe(100);
  });
});
