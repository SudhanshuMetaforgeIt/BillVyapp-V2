'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import {
  listServiceCategories,
  listServices,
} from '../services/walk-in-billing.service';

export const SERVICE_CATALOG_QUERY_KEY = ['services', 'catalog'] as const;

/** Any service carries the current business rate, independent of catalog filters. */
export function useBusinessServiceTax(salonId?: string | null) {
  return useScopedQuery(
    [...SERVICE_CATALOG_QUERY_KEY, 'business-tax', salonId],
    () => listServices({ salonId: salonId!, limit: 1 }),
    { enabled: Boolean(salonId), staleTime: 0, refetchInterval: 30_000, placeholderData: undefined },
  );
}

export function useServiceCategories(enabled: boolean, salonId?: string | null, gender?: import('@/lib/gender').Gender) {
  return useScopedQuery(
    [...SERVICE_CATALOG_QUERY_KEY, 'categories', salonId ?? null, gender],
    () => listServiceCategories(salonId ?? undefined, gender),
    { enabled, staleTime: QUERY_FRESHNESS.catalog, placeholderData: undefined },
  );
}

export function useSalonServices(
  enabled: boolean,
  params: { search: string; categoryId: string; salonId?: string | null; gender?: import('@/lib/gender').Gender },
) {
  return useScopedQuery(
    [...SERVICE_CATALOG_QUERY_KEY, 'services', 'exact-gender', params.salonId ?? null, params.search, params.categoryId, params.gender],
    () =>
      listServices({
        gender: params.gender,
        salonId: params.salonId || undefined,
        search: params.search || undefined,
        categoryId: params.categoryId || undefined,
      }),
    { enabled, staleTime: QUERY_FRESHNESS.catalog, placeholderData: undefined },
  );
}
