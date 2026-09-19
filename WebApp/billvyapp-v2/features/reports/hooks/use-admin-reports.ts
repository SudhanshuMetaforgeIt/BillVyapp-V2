'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAdminReportsData } from '../services/admin-reports.service';
import type { AdminReportsFilterState } from '../types/admin-reports.types';

export function useAdminReports(filters: Partial<AdminReportsFilterState> = {}) {
  return useQuery({
    queryKey: ['admin-reports-overview', filters],
    queryFn: () => fetchAdminReportsData(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}
