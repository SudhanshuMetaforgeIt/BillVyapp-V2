import {
  businessMonthToDate,
  businessToday,
} from '@/lib/business-calendar';
import {
  addCalendarDays,
  startOfMonthBusinessDateOnly,
} from '@/lib/business-timezone';
import { api, apiClient } from '@/services/api-client';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  FranchiseListItem,
  PaginatedResponse,
  PaymentListItem,
} from '@/features/dashboard/types/dashboard.types';
import type {
  FranchiseOption,
  ReportFormat,
  ReportListRow,
  ReportsListParams,
  ReportsPageData,
  ReportType,
  ReportTypeSlice,
  RevenuePoint,
} from '../types/reports.types';

type PaymentApiItem = PaymentListItem & { amount: string };

type PlatformReportApiItem = {
  id: string;
  name: string;
  description: string | null;
  type: ReportType;
  typeLabel: string;
  format: ReportFormat;
  dateFrom: string;
  dateTo: string;
  dateRangeLabel: string;
  franchiseId: string | null;
  franchiseName: string | null;
  generatedById: string;
  generatedBy: string;
  generatedOn: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type PlatformReportsListResponse = {
  data: PlatformReportApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    byType: Array<{ type: ReportType; count: number }>;
  };
};

export type GenerateReportPayload = {
  type: ReportType;
  format?: ReportFormat;
  dateFrom: string;
  dateTo: string;
  franchiseId?: string;
};

const SAMPLE = 100;

const TYPE_COLORS: Record<ReportType, string> = {
  financial: '#22c55e',
  business: '#f59e0b',
  user: '#3b82f6',
  transaction: '#ef4444',
  subscription: '#8b5cf6',
  activity: '#64748b',
};

const TYPE_LABELS: Record<ReportType, string> = {
  financial: 'Financial',
  business: 'Business',
  user: 'User',
  transaction: 'Transaction',
  subscription: 'Subscription',
  activity: 'Activity',
};

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
  const today = businessToday();
  const currentMonthStart = startOfMonthBusinessDateOnly();
  const [y, m] = currentMonthStart.split('-').map(Number);

  const points = await Promise.all(
    Array.from({ length: months }, async (_, index) => {
      const offset = months - 1 - index;
      const fromUtc = new Date(Date.UTC(y, m - 1 - offset, 1));
      const dateFrom = `${fromUtc.getUTCFullYear()}-${String(fromUtc.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(
        Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth() + 1, 1),
      );
      const monthEnd = addCalendarDays(
        `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`,
        -1,
      );
      const dateTo = offset === 0 ? today : monthEnd;
      const { sum, partial } = await sumSuccessfulPayments(dateFrom, dateTo);
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }).format(
        new Date(
          Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth(), 1, 12),
        ),
      );
      return {
        point: {
          monthKey: dateFrom.slice(0, 7),
          label,
          amount: sum,
        },
        partial,
      };
    }),
  );
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

function mapReportRow(row: PlatformReportApiItem): ReportListRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    type: row.type,
    typeLabel: row.typeLabel || TYPE_LABELS[row.type],
    dateRangeLabel: row.dateRangeLabel,
    generatedOn: row.generatedOn,
    generatedBy: row.generatedBy,
    format: row.format,
  };
}

function buildTypeSlices(
  byType: Array<{ type: ReportType; count: number }>,
  total: number,
): ReportTypeSlice[] {
  return byType
    .filter((row) => row.count > 0)
    .map((row) => ({
      key: row.type,
      label: TYPE_LABELS[row.type],
      count: row.count,
      percent: total > 0 ? (row.count / total) * 100 : 0,
      color: TYPE_COLORS[row.type],
    }));
}

/**
 * Loads Reports page KPIs from existing list APIs and report history from
 * `/platform-reports`.
 */
export async function fetchReportsPage(
  params: ReportsListParams,
): Promise<ReportsPageData> {
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;

  const reportParams: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.franchiseId && params.franchiseId !== 'all') {
    reportParams.franchiseId = params.franchiseId;
  }
  if (params.reportType && params.reportType !== 'all') {
    reportParams.type = params.reportType;
  }

  const [
    revenue,
    transactions,
    usersPage,
    customersPage,
    franchisesPage,
    franchises,
    revenueSeries,
    reportsPage,
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
    api.get<PlatformReportsListResponse>('/platform-reports', {
      params: reportParams,
    }),
  ]);

  const rows = reportsPage.data.map(mapReportRow);
  const reportsByType = buildTypeSlices(
    reportsPage.summary.byType,
    reportsPage.summary.total,
  );

  return {
    metrics: buildMetrics({
      revenue: revenue.sum,
      revenuePartial: revenue.partial,
      transactions,
      users: usersPage.meta.total + customersPage.meta.total,
      businesses: franchisesPage.meta.total,
    }),
    rows,
    meta: reportsPage.meta,
    revenueSeries,
    reportsByType,
    reportsTotal: reportsPage.summary.total,
    franchises,
  };
}

export async function generatePlatformReport(
  payload: GenerateReportPayload,
): Promise<ReportListRow> {
  const body: GenerateReportPayload = {
    type: payload.type,
    format: payload.format ?? 'excel',
    dateFrom: payload.dateFrom,
    dateTo: payload.dateTo,
  };
  if (payload.franchiseId) {
    body.franchiseId = payload.franchiseId;
  }
  const row = await api.post<PlatformReportApiItem>(
    '/platform-reports/generate',
    body,
  );
  return mapReportRow(row);
}

export async function downloadPlatformReport(id: string): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/platform-reports/${id}/download`,
    { responseType: 'blob' },
  );

  const disposition = response.headers['content-disposition'] as
    | string
    | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? `platform-report-${id}.csv`;

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function defaultReportsDateRange(): { dateFrom: string; dateTo: string } {
  return businessMonthToDate();
}
