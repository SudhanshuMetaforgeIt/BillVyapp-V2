'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import { fetchAdminDashboard } from '../services/admin-dashboard.service';

export const ADMIN_DASHBOARD_QUERY_KEY = ['dashboard', 'admin'] as const;

export function useAdminDashboard(salonId?: string) {
  const scopedSalonId = salonId?.trim() || undefined;
  return useScopedQuery(
    [...ADMIN_DASHBOARD_QUERY_KEY, scopedSalonId ?? 'all'],
    () => fetchAdminDashboard({ salonId: scopedSalonId }),
    { staleTime: QUERY_FRESHNESS.dashboard, placeholderData: undefined },
  );
}
