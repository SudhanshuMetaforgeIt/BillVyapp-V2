import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns';

import { api } from '@/services/api-client';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  FranchiseListItem,
  PaginatedResponse,
  PaymentListItem,
} from '@/features/dashboard/types/dashboard.types';
import type {
  FranchiseOption,
  ReportListRow,
  ReportsListParams,
  ReportsPageData,
  ReportTypeSlice,
  RevenuePoint,
} from '../types/reports.types';

type PaymentApiItem = PaymentListItem & { amount: string };

const SAMPLE = 100;

async function sumSuccessfulPayments(
  dateFrom: string,
  dateTo: string,
): Promise<{ sum: number; partial: boolean }> {
  const page = await api.get<PaginatedResponse<PaymentApiItem>>('/payments', {
    params: {
      status: 'SUCCESS',
      dateFrom,
      dateTo,
      page: 1,
      limit: SAMPLE,
    },
  });

  const sum = page.data.reduce((acc, row) => {
    const amount = Number(row.amount);
    return acc + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return { sum, partial: page.meta.total > page.data.length };
}

async function countPayments(dateFrom: string, dateTo: string): Promise<number> {
  const page = await api.get<PaginatedResponse<PaymentApiItem>>('/payments', {
    params: {
      page: 1,
      limit: 1,
      dateFrom,
      dateTo,
    },
  });
  return page.meta.total;
}

async function fetchFranchises(): Promise<FranchiseOption[]> {
  const page = await api.get<PaginatedResponse<FranchiseListItem>>(
    '/franchises',
    { params: { page: 1, limit: 100 } },
  );
  return page.data.map((row) => ({ id: row.id, name: row.name }));
}

async function buildRevenueSeries(months = 6): Promise<RevenuePoint[]> {
  const now = new Date();
  const points = await Promise.all(
    Array.from({ length: months }, async (_, index) => {
      const offset = months - 1 - index;
      const monthDate = subMonths(now, offset);
      const from = startOfMonth(monthDate);
      const to = endOfMonth(monthDate);
      const { sum, partial } = await sumSuccessfulPayments(
        format(from, 'yyyy-MM-dd'),
        format(to, 'yyyy-MM-dd'),
      );
      return {
        point: { monthKey: format(from, 'yyyy-MM'), label: format(from, "MMM ''yy"), amount: sum },
        partial,
      };
    }),
  );
  // A month summed from a capped page would draw a wrong bar; show no chart
  // rather than a misleading one until a revenue report endpoint exists.
  return points.some((p) => p.partial) ? [] : points.map((p) => p.point);
}

function buildMetrics(values: {
  revenue: number;
  revenuePartial: boolean;
  transactions: number;
  users: number;
  businesses: number;
}): DashboardMetric[] {
  return [
    {
      id: 'reports-total-revenue',
      label: 'Total Revenue',
      value: String(values.revenue),
      rawValue: values.revenue,
      comparisonLabel: 'selected period',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
      partial: values.revenuePartial,
      partialSample: SAMPLE,
    },
    {
      id: 'reports-total-transactions',
      label: 'Total Transactions',
      value: String(values.transactions),
      rawValue: values.transactions,
      comparisonLabel: 'selected period',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'reports-total-users',
      label: 'Total Users',
      value: String(values.users),
      rawValue: values.users,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'reports-total-businesses',
      label: 'Total Businesses',
      value: String(values.businesses),
      rawValue: values.businesses,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
  ];
}

/**
 * Loads Reports page KPIs from existing list APIs.
 * Generated-report history has no backend yet — rows stay empty.
 */
export async function fetchReportsPage(
  params: ReportsListParams,
): Promise<ReportsPageData> {
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;
  // franchiseId / reportType reserved for when a reports history API exists.
  void params.franchiseId;
  void params.reportType;
  void params.page;

  const [
    revenue,
    transactions,
    usersPage,
    customersPage,
    franchisesPage,
    franchises,
    revenueSeries,
  ] = await Promise.all([
    sumSuccessfulPayments(dateFrom, dateTo),
    countPayments(dateFrom, dateTo),
    api.get<PaginatedResponse<{ id: string }>>('/users', {
      params: { page: 1, limit: 1 },
    }),
    api.get<PaginatedResponse<{ id: string }>>('/customers', {
      params: { page: 1, limit: 1 },
    }),
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 1 },
    }),
    fetchFranchises(),
    buildRevenueSeries(6),
  ]);

  // No reports history API yet.
  const rows: ReportListRow[] = [];
  const reportsByType: ReportTypeSlice[] = [];

  return {
    metrics: buildMetrics({
      revenue: revenue.sum,
      revenuePartial: revenue.partial,
      transactions,
      users: usersPage.meta.total + customersPage.meta.total,
      businesses: franchisesPage.meta.total,
    }),
    rows,
    meta: {
      page: 1,
      limit: params.limit,
      total: 0,
      totalPages: 0,
    },
    revenueSeries,
    reportsByType,
    reportsTotal: 0,
    franchises,
  };
}

export function defaultReportsDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  return {
    dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
  };
}
