'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import {
  listServiceCategories,
  listServices,
} from '../services/walk-in-billing.service';

export const SERVICE_CATALOG_QUERY_KEY = ['services', 'catalog'] as const;

export function useServiceCategories(enabled: boolean, salonId?: string | null) {
  return useScopedQuery(
    [...SERVICE_CATALOG_QUERY_KEY, 'categories', salonId ?? null],
    () => listServiceCategories(salonId ?? undefined),
    { enabled },
  );
}

export function useSalonServices(
  enabled: boolean,
  params: { search: string; categoryId: string; salonId?: string | null },
) {
  return useScopedQuery(
    [...SERVICE_CATALOG_QUERY_KEY, 'services', params.salonId ?? null, params.search, params.categoryId],
    () =>
      listServices({
        salonId: params.salonId || undefined,
        search: params.search || undefined,
        categoryId: params.categoryId || undefined,
      }),
    { enabled },
  );
}
