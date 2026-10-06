'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { invalidateAfter, invalidatePaths } from '@/lib/query-invalidation';
import {
  createCustomer,
  fetchAdminCustomers,
} from '../services/admin-customers.service';
import type {
  CreateCustomerPayload,
  CustomersFilterState,
} from '../types/admin-customers.types';

export function useAdminCustomers(filters: Partial<CustomersFilterState> = {}) {
  return useScopedQuery(['admin-customers', filters], () => fetchAdminCustomers(filters), {
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      void invalidateAfter(queryClient, 'customers');
      void invalidatePaths(queryClient, [['dashboard']]);
    },
  });
}
