import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { createService, updateService } from './admin-services.service';
vi.mock('@/services/api-client', () => ({ api: { post: vi.fn(), patch: vi.fn() } }));

describe('Franchise service product recipes', () => {
  const productRecipe = [{ productId: 'shampoo', mode: 'PERCENT' as const, value: 5 }];
  const response = { id: 'service', salonId: 'shop', categoryId: 'category', name: 'Hairwash', durationMinutes: 10, price: 100,
    isActive: true, productRecipe, createdAt: '2026-10-12' };
  beforeEach(() => { vi.resetAllMocks(); });
  it('saves and retains the product recipe when creating a service', async () => {
    vi.mocked(api.post).mockResolvedValue(response);
    const payload = { salonId: 'shop', categoryId: 'category', name: 'Hairwash', durationMinutes: 10, price: 100, productRecipe };
    expect((await createService(payload)).productRecipe).toEqual(productRecipe);
    expect(api.post).toHaveBeenCalledWith('/services', payload);
  });
  it('can replace or clear a recipe without changing ownership', async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...response, productRecipe: [] });
    expect((await updateService('service', { productRecipe: [] })).productRecipe).toEqual([]);
    expect(api.patch).toHaveBeenCalledWith('/services/service', { productRecipe: [] });
  });
});
