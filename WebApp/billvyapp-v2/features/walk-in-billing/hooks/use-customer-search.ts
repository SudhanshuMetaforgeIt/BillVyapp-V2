'use client';

import { useQuery } from '@tanstack/react-query';

import { searchCustomers } from '../services/walk-in-billing.service';
import { normalizeIndianPhone } from '../lib/bill-preview';

export const CUSTOMER_SEARCH_QUERY_KEY = ['walk-in-billing', 'customers'] as const;

export function useCustomerSearch(rawSearch: string) {
  const search = normalizeIndianPhone(rawSearch);
  const enabled = search.length >= 3;

  return useQuery({
    queryKey: [...CUSTOMER_SEARCH_QUERY_KEY, search],
    queryFn: () => searchCustomers(search),
    enabled,
  });
}
