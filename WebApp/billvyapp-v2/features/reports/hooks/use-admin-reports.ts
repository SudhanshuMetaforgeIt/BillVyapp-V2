'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import { fetchAdminReportsData } from '../services/admin-reports.service';
import type { AdminReportsFilterState } from '../types/admin-reports.types';

export function useAdminReports(filters: Partial<AdminReportsFilterState> = {}) {
  return useScopedQuery(['admin-reports-overview', filters], () => fetchAdminReportsData(filters), {
    staleTime: QUERY_FRESHNESS.activity,
  });
}
