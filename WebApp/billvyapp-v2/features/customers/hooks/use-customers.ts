'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCustomersPage } from '../services/customers.service';
import type { CustomersListParams } from '../types/customers.types';

export const CUSTOMERS_QUERY_KEY = ['customers', 'manager'] as const;

export function useCustomers(params: CustomersListParams) {
  return useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, params],
    queryFn: () => fetchCustomersPage(params),
  });
}
