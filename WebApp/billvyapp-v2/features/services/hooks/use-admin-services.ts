'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import { invalidateAfter } from '@/lib/query-invalidation';

import {
  createService,
  createServiceCategory,
  fetchAdminServices,
  fetchServiceCategories,
  toggleServiceStatus,
  updateService,
  bulkCreateServices,
  type AdminServicesResult,
  type BulkServiceRow,
  type BulkServicesResult,
} from '../services/admin-services.service';
import type { CreateServicePayload, ServicesFilterState } from '../types/admin-services.types';

export const SERVICES_QUERY_KEY = ['admin', 'services'] as const;
export const CATEGORIES_QUERY_KEY = ['admin', 'service-categories'] as const;

export function useAdminServices(filters: Partial<ServicesFilterState>) {
  return useQuery<AdminServicesResult>({
    queryKey: [...SERVICES_QUERY_KEY, filters],
    queryFn: () => fetchAdminServices(filters),
    staleTime: QUERY_FRESHNESS.catalog,
  });
}

export function useServiceCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchServiceCategories,
    staleTime: QUERY_FRESHNESS.catalog,
  });
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleServiceStatus(id, isActive),
    onSuccess: () => {
      void invalidateAfter(queryClient, 'services');
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateServicePayload) => createService(payload),
    onSuccess: () => {
      void invalidateAfter(queryClient, 'services');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      gender?: import('@/lib/gender').Gender;
      categoryId?: string;
      name?: string;
      description?: string;
      productRecipe?: import("../utils/product-recipe").ProductRecipe[];
      durationMinutes?: number;
      price?: number;
    }) => updateService(id, payload),
    onSuccess: () => {
      void invalidateAfter(queryClient, 'services');
    },
  });
}

export function useCreateServiceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { salonId: string; name: string; gender: import('@/lib/gender').Gender; description?: string }) =>
      createServiceCategory(data),
    onSuccess: () => {
      void invalidateAfter(queryClient, 'services');
    },
  });
}

export function useBulkCreateServices() {
  const queryClient = useQueryClient();

  return useMutation<
    BulkServicesResult,
    Error,
    { salonId: string; services: BulkServiceRow[] }
  >({
    mutationFn: bulkCreateServices,
    onSuccess: () => {
      void invalidateAfter(queryClient, 'services');
    },
  });
}
