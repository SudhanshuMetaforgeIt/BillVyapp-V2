'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchAdminDashboard,
  type AdminDashboardData,
} from '../services/admin-dashboard.service';

export const ADMIN_DASHBOARD_QUERY_KEY = ['dashboard', 'admin'] as const;

export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: fetchAdminDashboard,
  });
}
