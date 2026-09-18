'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchManagerDashboard,
  type ManagerDashboardData,
} from '../services/dashboard.service';

export const MANAGER_DASHBOARD_QUERY_KEY = ['dashboard', 'manager'] as const;

export function useManagerDashboard() {
  return useQuery<ManagerDashboardData>({
    queryKey: MANAGER_DASHBOARD_QUERY_KEY,
    queryFn: fetchManagerDashboard,
  });
}
