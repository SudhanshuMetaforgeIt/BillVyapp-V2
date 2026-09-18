'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomer,
  fetchAdminCustomers,
} from '../services/customers.service';
import type {
  CreateCustomerPayload,
  CustomersFilterState,
} from '../types/customers.types';

export function useAdminCustomers(filters: Partial<CustomersFilterState> = {}) {
  return useQuery({
    queryKey: ['admin-customers', filters],
    queryFn: () => fetchAdminCustomers(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
    },
  });
}
