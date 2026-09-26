'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchCustomersPage } from '../services/customers.service';
import type { CustomersListParams } from '../types/customers.types';

export const CUSTOMERS_QUERY_KEY = ['customers', 'manager'] as const;

export function useCustomers(params: CustomersListParams) {
  return useScopedQuery([...CUSTOMERS_QUERY_KEY, params], () => fetchCustomersPage(params), {
    capability: 'customers.read',
  });
}
