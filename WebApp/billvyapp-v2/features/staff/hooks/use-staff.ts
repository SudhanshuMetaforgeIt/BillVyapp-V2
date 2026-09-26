'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { invalidateAfter } from '@/lib/query-invalidation';
import { createStaff, fetchAdminStaff } from '../services/staff.service';
import type { CreateStaffPayload, StaffFilterState } from '../types/staff.types';

export function useAdminStaff(filters: Partial<StaffFilterState> = {}) {
  return useScopedQuery(['admin-staff', filters], () => fetchAdminStaff(filters), {
    capability: 'users.read',
    staleTime: 30_000,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => createStaff(payload),
    onSuccess: () => {
      void invalidateAfter(queryClient, 'dashboard');
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some((segment) => segment === 'admin-staff'),
      });
    },
  });
}
