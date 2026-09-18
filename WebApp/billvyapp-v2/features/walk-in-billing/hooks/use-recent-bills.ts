'use client';

import { useQuery } from '@tanstack/react-query';

import { listCustomerBills } from '../services/walk-in-billing.service';

export const RECENT_BILLS_QUERY_KEY = ['walk-in-billing', 'recent-bills'] as const;

export function useRecentBills(customerId: string | null) {
  return useQuery({
    queryKey: [...RECENT_BILLS_QUERY_KEY, customerId],
    queryFn: () => listCustomerBills(customerId!),
    enabled: Boolean(customerId),
  });
}
