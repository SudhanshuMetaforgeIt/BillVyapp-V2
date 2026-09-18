'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchInventoryPage } from '../services/inventory.service';
import type { InventoryListParams } from '../types/inventory.types';

export const INVENTORY_QUERY_KEY = ['inventory', 'manager'] as const;

export function useInventory(params: InventoryListParams) {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, params],
    queryFn: () => fetchInventoryPage(params),
  });
}
