import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type { RevenuePoint } from '@/features/dashboard/data/placeholders';
import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/features/dashboard/types/dashboard.types';

export type { DashboardMetric, PaginationMeta, PaginatedResponse, RevenuePoint };

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
