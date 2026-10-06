'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import { fetchManagerDashboard } from '../services/dashboard.service';

export const MANAGER_DASHBOARD_QUERY_KEY = ['dashboard', 'manager'] as const;

export function useManagerDashboard() {
  return useScopedQuery(MANAGER_DASHBOARD_QUERY_KEY, fetchManagerDashboard, {
    placeholderData: undefined,
    staleTime: QUERY_FRESHNESS.dashboard,
  });
}
