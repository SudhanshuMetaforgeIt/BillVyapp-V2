'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchAdminDashboard } from '../services/admin-dashboard.service';

export const ADMIN_DASHBOARD_QUERY_KEY = ['dashboard', 'admin'] as const;

export function useAdminDashboard(salonId?: string) {
  const scopedSalonId = salonId?.trim() || undefined;
  return useScopedQuery(
    [...ADMIN_DASHBOARD_QUERY_KEY, scopedSalonId ?? 'all'],
    () => fetchAdminDashboard({ salonId: scopedSalonId }),
  );
}
