'use client';

import { useQuery } from '@tanstack/react-query';

import {
  listServiceCategories,
  listServices,
} from '../services/walk-in-billing.service';

export const SERVICE_CATALOG_QUERY_KEY = [
  'walk-in-billing',
  'catalog',
] as const;

export function useServiceCategories(enabled: boolean) {
  return useQuery({
    queryKey: [...SERVICE_CATALOG_QUERY_KEY, 'categories'],
    queryFn: listServiceCategories,
    enabled,
  });
}

export function useSalonServices(
  enabled: boolean,
  params: { search: string; categoryId: string },
) {
  return useQuery({
    queryKey: [
      ...SERVICE_CATALOG_QUERY_KEY,
      'services',
      params.search,
      params.categoryId,
    ],
    queryFn: () =>
      listServices({
        search: params.search || undefined,
        categoryId: params.categoryId || undefined,
      }),
    enabled,
  });
}
