'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchSuperAdminDashboard,
  type SuperAdminDashboardData,
} from '../services/dashboard.service';

export const SUPER_ADMIN_DASHBOARD_QUERY_KEY = [
  'dashboard',
  'super-admin',
] as const;

export function useSuperAdminDashboard() {
  return useQuery<SuperAdminDashboardData>({
    queryKey: SUPER_ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: fetchSuperAdminDashboard,
  });
}
