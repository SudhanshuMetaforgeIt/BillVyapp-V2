'use client';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';

import { searchCustomers } from '../services/walk-in-billing.service';
import { normalizeIndianPhone } from '../lib/bill-preview';

export const CUSTOMER_SEARCH_QUERY_KEY = ['walk-in-billing', 'customers'] as const;

export function useCustomerSearch(rawSearch: string) {
  const search = useDebouncedValue(normalizeIndianPhone(rawSearch), 300);
  const enabled = search.length >= 3;

  return useScopedQuery(
    [...CUSTOMER_SEARCH_QUERY_KEY, search],
    () => searchCustomers(search),
    { enabled, placeholderData: undefined, staleTime: QUERY_FRESHNESS.search },
  );
}
