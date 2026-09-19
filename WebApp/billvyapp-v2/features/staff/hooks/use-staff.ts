'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStaff, fetchAdminStaff } from '../services/staff.service';
import type { CreateStaffPayload, StaffFilterState } from '../types/staff.types';

export function useAdminStaff(filters: Partial<StaffFilterState> = {}) {
  return useQuery({
    queryKey: ['admin-staff', filters],
    queryFn: () => fetchAdminStaff(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => createStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}
