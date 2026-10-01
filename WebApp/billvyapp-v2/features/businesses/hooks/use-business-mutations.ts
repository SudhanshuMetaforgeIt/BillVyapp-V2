'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { SUPER_ADMIN_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-super-admin-dashboard';
import {
  updateBusiness,
  updateBusinessStatus,
} from '../services/businesses.service';
import type {
  FranchiseListItem,
  UpdateBusinessPayload,
} from '../types/businesses.types';
import { BUSINESSES_QUERY_KEY } from './use-businesses';

function invalidateBusinessCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY });
  void queryClient.invalidateQueries({
    queryKey: SUPER_ADMIN_DASHBOARD_QUERY_KEY,
  });
}

export function useUpdateBusiness(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<
    FranchiseListItem,
    ApiError,
    { id: string; payload: UpdateBusinessPayload }
  >({
    mutationFn: ({ id, payload }) => updateBusiness(id, payload),
    onSuccess: (franchise) => {
      toast.success(`${franchise.name} updated`);
      invalidateBusinessCaches(queryClient);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBusinessStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    FranchiseListItem,
    ApiError,
    { id: string; isActive: boolean; name: string }
  >({
    mutationFn: ({ id, isActive }) => updateBusinessStatus(id, isActive),
    onSuccess: (franchise) => {
      toast.success(
        `${franchise.name} ${franchise.isActive ? 'activated' : 'suspended'}`,
      );
      invalidateBusinessCaches(queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
