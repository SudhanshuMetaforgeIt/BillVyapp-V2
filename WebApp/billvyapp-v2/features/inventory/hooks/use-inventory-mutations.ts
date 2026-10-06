'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { invalidateAfter, invalidatePaths } from '@/lib/query-invalidation';
import {
  adjustStock,
  createProduct,
  createProductCategory,
} from '../services/inventory.service';
import type {
  AdjustStockPayload,
  CreateProductCategoryPayload,
  CreateProductPayload,
  InventoryApiItem,
  ProductApiItem,
  ProductCategoryApiItem,
} from '../types/inventory.types';

export function useAdjustStock(onSuccess?: (row: InventoryApiItem) => void) {
  const queryClient = useQueryClient();

  return useMutation<InventoryApiItem, ApiError, AdjustStockPayload>({
    mutationFn: adjustStock,
    onSuccess: (row) => {
      toast.success(`Stock updated for ${row.productName}`);
      void invalidateAfter(queryClient, 'inventory');
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
      void invalidatePaths(queryClient, [['inventory'], ['products'], ['dashboard']]);
      onSuccess?.(product);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateProductCategory(
  onSuccess?: (category: ProductCategoryApiItem) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<
    ProductCategoryApiItem,
    ApiError,
    CreateProductCategoryPayload
  >({
    mutationFn: createProductCategory,
    onSuccess: (category) => {
      toast.success(`Category "${category.name}" created`);
      void invalidatePaths(queryClient, [
        ['inventory'],
        ['product-categories'],
        ['products'],
        ['dashboard'],
      ]);
      onSuccess?.(category);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

