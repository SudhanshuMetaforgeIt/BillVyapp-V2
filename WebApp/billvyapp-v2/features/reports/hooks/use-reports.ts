'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchReportsPage } from '../services/reports.service';
import type { ReportsListParams, ReportsPageData } from '../types/reports.types';

export const REPORTS_QUERY_KEY = ['reports', 'super-admin'] as const;

export function useReports(params: ReportsListParams) {
  return useQuery<ReportsPageData>({
    queryKey: [...REPORTS_QUERY_KEY, params],
    queryFn: () => fetchReportsPage(params),
    placeholderData: (previous) => previous,
  });
}
