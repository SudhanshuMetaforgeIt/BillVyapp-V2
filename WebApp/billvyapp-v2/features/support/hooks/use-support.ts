'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';

import { fetchSupportPage } from '../services/support.service';
import type { SupportListParams, SupportPageData } from '../types/support.types';

export const SUPPORT_QUERY_KEY = ['support', 'tickets'] as const;

export function useSupport(params: SupportListParams) {
  return useQuery<SupportPageData>({
    queryKey: [...SUPPORT_QUERY_KEY, params],
    queryFn: () => fetchSupportPage(params),
    placeholderData: (previous) => previous,
    staleTime: QUERY_FRESHNESS.activity,
  });
}
