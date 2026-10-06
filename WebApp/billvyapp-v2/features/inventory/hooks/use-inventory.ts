'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import { fetchInventoryPage } from '../services/inventory.service';
import type { InventoryListParams } from '../types/inventory.types';

export const INVENTORY_QUERY_KEY = ['inventory', 'manager'] as const;

export function useInventory(params: InventoryListParams) {
  return useScopedQuery([...INVENTORY_QUERY_KEY, params], () => fetchInventoryPage(params), {
    capability: 'inventory.read',
    staleTime: QUERY_FRESHNESS.activity,
    refetchOnWindowFocus: true,
  });
}
