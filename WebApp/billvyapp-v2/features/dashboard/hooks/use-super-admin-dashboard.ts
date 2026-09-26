'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchSuperAdminDashboard } from '../services/dashboard.service';

export const SUPER_ADMIN_DASHBOARD_QUERY_KEY = ['dashboard', 'super-admin'] as const;

export function useSuperAdminDashboard() {
  return useScopedQuery(SUPER_ADMIN_DASHBOARD_QUERY_KEY, fetchSuperAdminDashboard, {
    placeholderData: undefined,
  });
}
