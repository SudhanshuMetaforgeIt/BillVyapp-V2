import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type { RevenuePoint } from '@/features/dashboard/data/placeholders';
import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/features/dashboard/types/dashboard.types';

export type {
  DashboardMetric,
  PaginationMeta,
  PaginatedResponse,
  RevenuePoint,
};

export type ReportType =
  | 'financial'
  | 'business'
  | 'user'
  | 'transaction'
  | 'subscription'
  | 'activity';

export type ReportTypeFilter = 'all' | ReportType;

export type ReportFormat = 'pdf' | 'excel';

export type ReportListRow = {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  typeLabel: string;
  dateRangeLabel: string;
  generatedOn: string;
  generatedBy: string;
  format: ReportFormat;
  dateFrom: string;
  dateTo: string;
  franchiseId: string | null;
  franchiseName: string | null;
  salonId: string | null;
  salonName: string | null;
  snapshot: Record<string, unknown>;
};

export type ReportTypeSlice = {
  key: ReportType;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type FranchiseOption = {
  id: string;
  name: string;
};

export type ReportsListParams = {
  page: number;
  limit: number;
  dateFrom: string;
  dateTo: string;
  franchiseId: string;
  reportType: ReportTypeFilter;
  salonId?: string;
};

export type ReportsPageData = {
  metrics: DashboardMetric[];
  rows: ReportListRow[];
  meta: PaginationMeta;
  revenueSeries: RevenuePoint[];
  reportsByType: ReportTypeSlice[];
  reportsTotal: number;
  franchises: FranchiseOption[];
};

export type AnalyticsRow = Record<string, string | number | null>;
export type ReportInterval = 'day' | 'week' | 'month' | 'year';
export type AnalyticsSection =
  'summary' | 'revenue' | 'business' | 'insights' | 'details';
export type AnalyticsParams = {
  dateFrom: string;
  dateTo: string;
  franchiseId: string;
  salonId: string;
  interval: ReportInterval;
  salonSort: 'revenue' | 'transactions' | 'customers' | 'averageBill';
  serviceSort: 'revenue' | 'quantity' | 'transactions';
};
export type ReportAnalytics = {
  scope: {
    dateFrom: string;
    dateTo: string;
    franchiseId: string | null;
    franchiseName: string | null;
    salonId: string | null;
    salonName: string | null;
    timeZone: string;
  };
  summary?: {
    totalRevenue: string;
    successfulPayments: number;
    totalPayments: number;
    userCount: number;
    customerCount: number;
    franchiseCount: number;
    salonCount: number;
    failedPayments: number;
    paymentSuccessRate: number | null;
    averageTransactionValue: number | null;
  };
  revenue?: {
    series: AnalyticsRow[];
    methods: AnalyticsRow[];
    statuses: AnalyticsRow[];
  };
  business?: { franchises: AnalyticsRow[]; salons: AnalyticsRow[] };
  insights?: {
    customers: AnalyticsRow[];
    roles: AnalyticsRow[];
    userFranchises: AnalyticsRow[];
    userSalons: AnalyticsRow[];
  };
  details?: {
    memberships: AnalyticsRow[];
    plans: AnalyticsRow[];
    services: AnalyticsRow[];
  };
};
export type ReportFilterOptions = {
  franchises: FranchiseOption[];
  salons: { id: string; name: string; franchiseId: string }[];
};
