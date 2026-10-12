import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { api } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/types/user.types';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { fetchAdminDashboard } from './admin-dashboard.service';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));
afterEach(() => { useAuthStore.setState({ user: null }); vi.clearAllMocks(); });

describe('Business currency on franchise dashboards', () => {
  it.each([
    ['USD', 'US', '$1,234.56', '$0.00', 'lucide-dollar-sign'],
    ['INR', 'IN', '₹1,234.56', '₹0.00', 'lucide-indian-rupee'],
  ] as const)('formats monetary totals and icons using %s', async (currency, phoneCountry, revenue, zero, iconClass) => {
    useAuthStore.setState({ user: { currency, phoneCountry } as AuthUser });
    vi.mocked(api.get).mockImplementation(async (path) => {
      const data = path === '/payments' ? [{ id: 'payment', amount: '1234.56', paymentDate: new Date().toISOString() }] : [];
      return { data, meta: { total: data.length, page: 1, limit: 100, totalPages: 1 } } as never;
    });
    const dashboard = await fetchAdminDashboard();
    expect(dashboard.stats.find(stat => stat.id === 'revenue-month')?.displayValue).toBe(revenue);
    expect(dashboard.glanceMetrics.find(stat => stat.id === 'today-sales')?.displayValue).toBe(revenue);
    expect(dashboard.stats.map(stat => stat.displayValue).join(' ')).not.toContain(currency === 'USD' ? '₹' : '$');
    expect(dashboard.businessSummary.some(row => row.value === zero)).toBe(true);
    expect(renderToStaticMarkup(createElement(CurrencyIcon, { currency }))).toContain(iconClass);
  });
});
