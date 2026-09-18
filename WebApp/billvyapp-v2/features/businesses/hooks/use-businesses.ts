'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchBusinessesPage,
} from '../services/businesses.service';
import type {
  BusinessesListParams,
  BusinessesPageData,
} from '../types/businesses.types';

export const BUSINESSES_QUERY_KEY = ['businesses', 'super-admin'] as const;

export function useBusinesses(params: BusinessesListParams) {
  return useQuery<BusinessesPageData>({
    queryKey: [...BUSINESSES_QUERY_KEY, params],
    queryFn: () => fetchBusinessesPage(params),
    placeholderData: (previous) => previous,
  });
}
