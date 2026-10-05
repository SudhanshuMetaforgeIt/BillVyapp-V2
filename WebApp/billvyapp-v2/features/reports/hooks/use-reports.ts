'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchReportsPage,
  fetchReportAnalytics,
  fetchReportFilterOptions,
} from '../services/reports.service';
import type {
  ReportsListParams,
  ReportsPageData,
  AnalyticsParams,
  AnalyticsSection,
} from '../types/reports.types';

export const REPORTS_QUERY_KEY = ['reports', 'super-admin'] as const;

export function useReports(params: ReportsListParams) {
  return useQuery<ReportsPageData>({
    queryKey: [
      ...REPORTS_QUERY_KEY,
      'history',
      {
        page: params.page,
        limit: params.limit,
        franchiseId: params.franchiseId,
        salonId: params.salonId,
        reportType: params.reportType,
      },
    ],
    queryFn: () => fetchReportsPage(params),
  });
}

export function useReportAnalytics(
  params: AnalyticsParams,
  section: AnalyticsSection,
) {
  const sectionParams: AnalyticsParams = {
    ...params,
    interval: section === 'revenue' ? params.interval : 'month',
    salonSort: section === 'business' ? params.salonSort : 'revenue',
    serviceSort: section === 'details' ? params.serviceSort : 'revenue',
  };
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'analytics', section, sectionParams],
    queryFn: () => fetchReportAnalytics(sectionParams, section),
    enabled: Boolean(
      params.dateFrom && params.dateTo && params.dateFrom <= params.dateTo,
    ),
  });
}
export function useReportFilterOptions(franchiseId: string) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'filter-options', franchiseId],
    queryFn: () => fetchReportFilterOptions(franchiseId),
  });
}
