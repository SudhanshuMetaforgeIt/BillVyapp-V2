import { format, parseISO } from 'date-fns';
import { api } from '@/services/api-client';
import type {
  AdminReportsData,
  AdminReportsFilterState,
  BillsOverviewSummary,
  BranchComparisonItem,
  RevenueByBranchItem,
  RevenuePoint,
  TopServiceByQuantityItem,
  TopServiceByRevenueItem,
} from '../types/admin-reports.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RawSalon = {
  id: string;
  name: string;
};

type RawBill = {
  id: string;
  salonId: string;
  total: string | number;
  paidAmount: string | number;
  status: string;
  paymentStatus: string;
  billDate: string;
  createdAt: string;
  items?: Array<{
    id: string;
    serviceId?: string | null;
    description?: string | null;
    quantity: number;
    total: string | number;
  }>;
};

const SAMPLE = 100;

/**
 * Admin reports composed from existing list endpoints. Counts come from
 * `meta.total` and are exact; amount sums and breakdowns are computed from
 * the most recent SAMPLE bills and flagged partial when more exist, until a
 * report endpoint is available.
 */
export async function fetchAdminReportsData(
  filters: Partial<AdminReportsFilterState> = {},
): Promise<AdminReportsData> {
  const scope: Record<string, unknown> = {};
  if (filters.branchId && filters.branchId !== 'all') scope.salonId = filters.branchId;
  if (filters.dateFrom) scope.dateFrom = filters.dateFrom;
  if (filters.dateTo) scope.dateTo = filters.dateTo;

  const count = (extra: Record<string, unknown>) =>
    api
      .get<PaginatedResponse<unknown>>('/bills', { params: { ...scope, ...extra, page: 1, limit: 1 } })
      .then((r) => r.meta.total);

  const [salonsRes, billsRes, paid, partial, unpaid, cancelled, customers, services, staff] =
    await Promise.all([
      api.get<PaginatedResponse<RawSalon>>('/salons', { params: { page: 1, limit: 100 } }),
      api.get<PaginatedResponse<RawBill>>('/bills', { params: { ...scope, page: 1, limit: SAMPLE } }),
      count({ paymentStatus: 'PAID' }),
      count({ paymentStatus: 'PARTIAL' }),
      count({ status: 'COMPLETED', paymentStatus: 'UNPAID' }),
      count({ status: 'CANCELLED' }),
      api.get<PaginatedResponse<unknown>>('/customers', { params: { page: 1, limit: 1 } }).then((r) => r.meta.total),
      api.get<PaginatedResponse<unknown>>('/services', { params: { page: 1, limit: 1 } }).then((r) => r.meta.total),
      api.get<PaginatedResponse<unknown>>('/users', { params: { page: 1, limit: 1 } }).then((r) => r.meta.total),
    ]);

  const rawSalons = salonsRes.data;
  const rawBills = billsRes.data;
  const totalBillsCount = billsRes.meta.total;
  const samplePartial = billsRes.meta.total > rawBills.length;
  const salonMap = new Map(rawSalons.map((s) => [s.id, s.name]));

  let totalRevenue = 0;
  const branchRevenueMap: Record<string, number> = {};
  const serviceRevenueMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
  const dailyRevenueMap: Record<string, number> = {};

  for (const b of rawBills) {
    if (b.status === 'CANCELLED' || b.status === 'DRAFT') continue;
    const collected = Number(b.paidAmount) || 0;
    const total = Number(b.total) || 0;
    totalRevenue += collected;

    const salonName = salonMap.get(b.salonId) ?? 'Unknown salon';
    branchRevenueMap[salonName] = (branchRevenueMap[salonName] ?? 0) + total;

    const date = parseISO(b.billDate || b.createdAt);
    if (!Number.isNaN(date.getTime())) {
      const key = format(date, 'MMM dd');
      dailyRevenueMap[key] = (dailyRevenueMap[key] ?? 0) + total;
    }

    for (const it of b.items ?? []) {
      const key = it.serviceId ?? it.description ?? it.id;
      const entry = (serviceRevenueMap[key] ??= {
        name: it.description?.trim() || 'Unnamed item',
        revenue: 0,
        quantity: 0,
      });
      entry.revenue += Number(it.total) || 0;
      entry.quantity += Number(it.quantity) || 0;
    }
  }

  const pct = (n: number) => (totalBillsCount > 0 ? Number(((n / totalBillsCount) * 100).toFixed(1)) : 0);

  const billsOverview: BillsOverviewSummary = {
    total: totalBillsCount,
    paid,
    paidPct: pct(paid),
    pending: partial,
    pendingPct: pct(partial),
    overdue: unpaid,
    overduePct: pct(unpaid),
    cancelled,
    cancelledPct: pct(cancelled),
  };

  const branchComparison: BranchComparisonItem[] = rawSalons.map((s) => ({
    id: s.id,
    name: s.name,
    revenue: branchRevenueMap[s.name] ?? 0,
    growth: '—',
    positive: false,
  }));

  const revenueByBranch: RevenueByBranchItem[] = Object.entries(branchRevenueMap).map(
    ([branchName, revenue]) => ({ branchName, revenue }),
  );

  const revenueSeries: RevenuePoint[] = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  const services_ = Object.values(serviceRevenueMap);
  const topServicesByRevenue: TopServiceByRevenueItem[] = [...services_]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((s, idx) => ({ id: String(idx + 1), name: s.name, revenue: s.revenue }));
  const topServicesByQuantity: TopServiceByQuantityItem[] = [...services_]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((s) => ({ name: s.name, quantity: s.quantity }));

  const sampleNote = samplePartial
    ? `Partial — latest ${SAMPLE} of ${totalBillsCount} bills`
    : 'Collected in selected period';

  return {
    stats: {
      totalRevenue,
      totalRevenueChange: sampleNote,
      totalBills: totalBillsCount,
      totalBillsChange: 'Selected period',
      totalCustomers: customers,
      totalCustomersChange: 'Current total',
      totalServices: services,
      totalServicesChange: 'Current total',
      totalStaff: staff,
      totalStaffChange: 'Current total',
    },
    revenueSeries,
    billsOverview,
    branchComparison,
    revenueByBranch,
    topServicesByRevenue,
    topServicesByQuantity,
    branches: rawSalons.map((s) => ({ id: s.id, name: s.name })),
  };
}
