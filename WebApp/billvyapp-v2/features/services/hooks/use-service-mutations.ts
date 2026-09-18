'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { SERVICE_CATALOG_QUERY_KEY } from '@/features/walk-in-billing/hooks/use-service-catalog';
import {
  createService,
  createServiceCategory,
  updateCategoryStatus,
  updateServiceStatus,
} from '../services/services.service';
import type {
  CreateServiceCategoryPayload,
  CreateServicePayload,
  ServiceApiItem,
  ServiceCategoryApiItem,
} from '../types/services.types';
import { SERVICES_QUERY_KEY } from './use-services';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: SERVICE_CATALOG_QUERY_KEY });
}

export function useCreateService(onSuccess?: (row: ServiceApiItem) => void) {
  const queryClient = useQueryClient();
  return useMutation<ServiceApiItem, ApiError, CreateServicePayload>({
    mutationFn: createService,
    onSuccess: (row) => {
      toast.success(`${row.name} added`);
      invalidate(queryClient);
      onSuccess?.(row);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useCreateServiceCategory(
  onSuccess?: (row: ServiceCategoryApiItem) => void,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ServiceCategoryApiItem,
    ApiError,
    CreateServiceCategoryPayload
  >({
    mutationFn: createServiceCategory,
    onSuccess: (row) => {
      toast.success(`${row.name} category added`);
      invalidate(queryClient);
      onSuccess?.(row);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    ServiceApiItem,
    ApiError,
    { id: string; isActive: boolean; name: string }
  >({
    mutationFn: ({ id, isActive }) => updateServiceStatus(id, isActive),
    onSuccess: (row) => {
      toast.success(
        `${row.name} marked ${row.isActive ? 'active' : 'inactive'}`,
      );
      invalidate(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useToggleCategoryStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    ServiceCategoryApiItem,
    ApiError,
    { id: string; isActive: boolean; name: string }
  >({
    mutationFn: ({ id, isActive }) => updateCategoryStatus(id, isActive),
    onSuccess: (row) => {
      toast.success(
        `${row.name} marked ${row.isActive ? 'active' : 'inactive'}`,
      );
      invalidate(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });
}
