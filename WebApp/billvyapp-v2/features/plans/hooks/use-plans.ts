'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPlansPage } from '../services/plans.service';
import type { PlansListParams, PlansPageData } from '../types/plans.types';

export const PLANS_QUERY_KEY = ['plans', 'super-admin'] as const;

export function usePlans(params: PlansListParams) {
  return useQuery<PlansPageData>({
    queryKey: [...PLANS_QUERY_KEY, params],
    queryFn: () => fetchPlansPage(params),
    placeholderData: (previous) => previous,
  });
}
