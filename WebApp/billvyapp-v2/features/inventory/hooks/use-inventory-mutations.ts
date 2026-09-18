'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { adjustStock, createProduct } from '../services/inventory.service';
import type {
  AdjustStockPayload,
  CreateProductPayload,
  InventoryApiItem,
  ProductApiItem,
} from '../types/inventory.types';
import { INVENTORY_QUERY_KEY } from './use-inventory';

export function useAdjustStock(onSuccess?: (row: InventoryApiItem) => void) {
  const queryClient = useQueryClient();

  return useMutation<InventoryApiItem, ApiError, AdjustStockPayload>({
    mutationFn: adjustStock,
    onSuccess: (row) => {
      toast.success(`Stock updated for ${row.productName}`);
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      onSuccess?.(row);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateProduct(onSuccess?: (product: ProductApiItem) => void) {
  const queryClient = useQueryClient();

  return useMutation<ProductApiItem, ApiError, CreateProductPayload>({
    mutationFn: createProduct,
    onSuccess: (product) => {
      toast.success(`${product.name} added to catalog`);
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      onSuccess?.(product);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
