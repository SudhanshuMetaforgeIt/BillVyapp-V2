'use client';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';

import { searchCustomers } from '../services/walk-in-billing.service';
import { customerPhoneSearchSchema } from '../lib/customer-phone';

export const CUSTOMER_SEARCH_QUERY_KEY = ['walk-in-billing', 'customers'] as const;

export function useCustomerSearch(rawSearch: string) {
  const parsed = customerPhoneSearchSchema.safeParse(rawSearch);
  const search = useDebouncedValue(parsed.success ? parsed.data : '', 300);
  const enabled = parsed.success && customerPhoneSearchSchema.safeParse(search).success;

  return useScopedQuery(
    [...CUSTOMER_SEARCH_QUERY_KEY, search],
    () => searchCustomers(search),
    { enabled, placeholderData: undefined, staleTime: QUERY_FRESHNESS.search },
  );
}
