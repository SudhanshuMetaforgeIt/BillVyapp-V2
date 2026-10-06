import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { useCreateProductCategory } from './use-inventory-mutations';
import { createProductCategory } from '../services/inventory.service';
import type { CreateProductCategoryPayload } from '../types/inventory.types';

const captured = vi.hoisted(() => ({
  mutationFn: undefined as undefined | ((input: CreateProductCategoryPayload) => Promise<unknown>),
  onSuccess: undefined as undefined | ((data: unknown) => void),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: (options: {
    mutationFn: (input: CreateProductCategoryPayload) => Promise<unknown>;
    onSuccess?: (data: unknown) => void;
  }) => {
    captured.mutationFn = options.mutationFn;
    captured.onSuccess = options.onSuccess;
    return {};
  },
}));

vi.mock('@/services/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Product Category Mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.mutationFn = undefined;
    captured.onSuccess = undefined;
  });

  it('createProductCategory sends POST to /product-categories with payload', async () => {
    const payload: CreateProductCategoryPayload = {
      salonId: 'salon-123',
      name: 'Hair Care',
      description: 'Shampoos and conditioners',
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'cat-1',
      salonId: 'salon-123',
      name: 'Hair Care',
      description: 'Shampoos and conditioners',
      isActive: true,
    });

    await createProductCategory(payload);

    expect(api.post).toHaveBeenCalledWith('/product-categories', payload);
  });

  it('useCreateProductCategory wires mutation and triggers onSuccess callback', async () => {
    const onSuccess = vi.fn();
    useCreateProductCategory(onSuccess);

    expect(captured.mutationFn).toBeDefined();

    const mockCategory = {
      id: 'cat-99',
      salonId: 'salon-123',
      name: 'Skincare',
      description: null,
      isActive: true,
    };

    captured.onSuccess?.(mockCategory);
    expect(onSuccess).toHaveBeenCalledWith(mockCategory);
  });
});
