'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPaymentsPage } from '../services/payments.service';
import type {
  PaymentsListParams,
  PaymentsPageData,
} from '../types/payments.types';

export const PAYMENTS_QUERY_KEY = ['payments', 'super-admin'] as const;

export function usePayments(params: PaymentsListParams) {
  return useQuery<PaymentsPageData>({
    queryKey: [...PAYMENTS_QUERY_KEY, params],
    queryFn: () => fetchPaymentsPage(params),
    placeholderData: (previous) => previous,
  });
}
