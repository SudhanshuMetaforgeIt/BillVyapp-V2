import { businessMonthToDate } from '@/lib/business-calendar';
import { api, apiClient } from '@/services/api-client';
import type {
  AnalyticsParams,
  AnalyticsSection,
  ReportAnalytics,
  ReportFilterOptions,
  ReportInterval,
} from '../types/reports.types';
import type {
  ReportFormat,
  ReportListRow,
  ReportsListParams,
  ReportsPageData,
  ReportType,
  ReportTypeSlice,
} from '../types/reports.types';

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
  salonId?: string;
  interval?: ReportInterval;
  salonSort?: AnalyticsParams['salonSort'];
  serviceSort?: AnalyticsParams['serviceSort'];
};

const TYPE_COLORS: Record<ReportType, string> = {
  financial: 'var(--bv-emerald)',
  business: 'var(--bv-champagne)',
  user: 'var(--bv-charcoal)',
  transaction: 'var(--bv-brand-orange)',
  subscription: 'var(--bv-champagne)',
  activity: 'var(--bv-charcoal)',
};

const TYPE_LABELS: Record<ReportType, string> = {
  financial: 'Financial',
  business: 'Business',
  user: 'User',
  transaction: 'Transaction',
  subscription: 'Subscription',
  activity: 'Activity',
};

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
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    franchiseId: row.franchiseId,
    franchiseName: row.franchiseName,
    salonId:
      typeof row.snapshot.salonId === 'string' ? row.snapshot.salonId : null,
    salonName:
      typeof row.snapshot.salonName === 'string'
        ? row.snapshot.salonName
        : null,
    snapshot: row.snapshot,
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
 * Loads paginated persisted report history independently of live analytics.
 * Each analytics section uses the server aggregation endpoint.
 */
export async function fetchReportsPage(
  params: ReportsListParams,
): Promise<ReportsPageData> {
  const reportParams: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.franchiseId !== 'all')
    reportParams.franchiseId = params.franchiseId;
  if (params.salonId && params.salonId !== 'all')
    reportParams.salonId = params.salonId;
  if (params.reportType !== 'all') reportParams.type = params.reportType;
  const reportsPage = await api.get<PlatformReportsListResponse>(
    '/platform-reports',
    { params: reportParams },
  );
  return {
    metrics: [],
    rows: reportsPage.data.map(mapReportRow),
    meta: reportsPage.meta,
    revenueSeries: [],
    reportsByType: buildTypeSlices(
      reportsPage.summary.byType,
      reportsPage.summary.total,
    ),
    reportsTotal: reportsPage.summary.total,
    franchises: [],
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
  if (payload.salonId) body.salonId = payload.salonId;
  if (payload.interval) body.interval = payload.interval;
  if (payload.salonSort) body.salonSort = payload.salonSort;
  if (payload.serviceSort) body.serviceSort = payload.serviceSort;
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
    string | undefined;
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

export function defaultReportsDateRange(): {
  dateFrom: string;
  dateTo: string;
} {
  return businessMonthToDate();
}

export function fetchReportAnalytics(
  params: AnalyticsParams,
  section: AnalyticsSection,
) {
  return api.get<ReportAnalytics>('/platform-reports/analytics', {
    params: {
      ...params,
      section,
      franchiseId:
        params.franchiseId === 'all' ? undefined : params.franchiseId,
      salonId: params.salonId === 'all' ? undefined : params.salonId,
    },
  });
}
export function fetchReportFilterOptions(franchiseId: string) {
  return api.get<ReportFilterOptions>('/platform-reports/filter-options', {
    params: { franchiseId: franchiseId === 'all' ? undefined : franchiseId },
  });
}
