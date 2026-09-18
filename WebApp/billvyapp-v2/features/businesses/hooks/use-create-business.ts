'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { SUPER_ADMIN_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-super-admin-dashboard';
import {
  createBusiness,
} from '../services/businesses.service';
import type {
  CreateBusinessPayload,
  FranchiseListItem,
} from '../types/businesses.types';
import { BUSINESSES_QUERY_KEY } from './use-businesses';

export function useCreateBusiness(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<FranchiseListItem, ApiError, CreateBusinessPayload>({
    mutationFn: createBusiness,
    onSuccess: (franchise) => {
      toast.success(`${franchise.name} created`);
      void queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_DASHBOARD_QUERY_KEY,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
