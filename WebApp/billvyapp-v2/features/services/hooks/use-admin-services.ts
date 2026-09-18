'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createService,
  createServiceCategory,
  fetchAdminServices,
  fetchServiceCategories,
  toggleServiceStatus,
  type AdminServicesResult,
} from '../services/admin-services.service';
import type { CreateServicePayload, ServicesFilterState } from '../types/admin-services.types';

export const SERVICES_QUERY_KEY = ['admin', 'services'] as const;
export const CATEGORIES_QUERY_KEY = ['admin', 'service-categories'] as const;

export function useAdminServices(filters: Partial<ServicesFilterState>) {
  return useQuery<AdminServicesResult>({
    queryKey: [...SERVICES_QUERY_KEY, filters],
    queryFn: () => fetchAdminServices(filters),
  });
}

export function useServiceCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchServiceCategories,
  });
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleServiceStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateServicePayload) => createService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
  });
}

export function useCreateServiceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { salonId: string; name: string; description?: string }) =>
      createServiceCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
