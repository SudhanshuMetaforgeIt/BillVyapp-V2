import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { fetchInventoryPage } from './inventory.service';
vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));

describe('Inventory catalog filtering', () => {
  beforeEach(() => vi.clearAllMocks());
  it('finds equipment beyond the first 100 items and keeps its category', async () => {
    const product = { id: 'dryer', categoryId: 'electrical', name: 'Hair Dryer', sku: 'DRYER' };
    const row = { id: 'stock', salonId: 'salon', productId: 'dryer', productName: 'Hair Dryer', productSku: 'DRYER', quantityOnHand: 2, availableQuantity: 2, reservedQuantity: 0, reorderLevel: 0, averageCost: '500', lastPurchasePrice: '500', lastStockedAt: null };
    vi.mocked(api.get).mockImplementation(async (path, config) => {
      const page = config?.params?.page;
      if (path === '/product-categories') return { data: [{ id: 'electrical', name: 'Electronics' }], meta: { page: 1, totalPages: 1 } };
      return { data: page === 2 ? [path === '/products' ? product : row] : [], meta: { page, totalPages: 2 } };
    });
    const result = await fetchInventoryPage({ page: 1, limit: 10, search: 'dryer', stockStatus: 'all', categoryId: 'electrical' });
    expect(result.meta.total).toBe(1);
    expect(result.rows[0]).toMatchObject({ productName: 'Hair Dryer', categoryLabel: 'Electronics' });
    expect(api.get).not.toHaveBeenCalledWith('/inventory', expect.objectContaining({ params: expect.objectContaining({ lowStock: true }) }));
  });

  it('labels and filters low stock only for consumables', async () => {
    const categories = ['Consumables', 'Furniture', 'Electronics', 'Tools'];
    const products = categories.map((name, index) => ({ id: `product-${index}`, categoryId: `category-${index}`, name, sku: name }));
    const stocks = products.map((product, index) => ({
      id: `stock-${index}`, salonId: 'salon', productId: product.id,
      productName: product.name, productSku: product.sku, quantityOnHand: 1,
      availableQuantity: 1, reservedQuantity: 0, reorderLevel: 5,
      averageCost: '100', lastPurchasePrice: '100', lastStockedAt: null,
    }));
    stocks.push({ ...stocks[1], id: 'empty-furniture', quantityOnHand: 0, availableQuantity: 0 });
    vi.mocked(api.get).mockImplementation(async (path) => {
      const data = path === '/products' ? products : path === '/product-categories'
        ? categories.map((name, index) => ({ id: `category-${index}`, name })) : stocks;
      return { data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1 } };
    });
    const params = { page: 1, limit: 10, search: '', stockStatus: 'all' as const, categoryId: '' };
    const all = await fetchInventoryPage(params);
    expect(all.rows.map(row => row.stockStatus)).toEqual(['low', 'healthy', 'healthy', 'healthy', 'out']);
    const low = await fetchInventoryPage({ ...params, stockStatus: 'low' });
    expect(low.rows.map(row => row.productName)).toEqual(['Consumables']);
    expect(low.meta.total).toBe(1);
    const furniture = await fetchInventoryPage({ ...params, stockStatus: 'low', categoryId: 'category-1' });
    expect(furniture.rows).toEqual([]);
    const healthy = await fetchInventoryPage({ ...params, stockStatus: 'healthy' });
    expect(healthy.rows.map(row => row.productName)).toEqual(['Furniture', 'Electronics', 'Tools']);
    expect(api.get).not.toHaveBeenCalledWith('/inventory', expect.objectContaining({ params: expect.objectContaining({ lowStock: true }) }));
  });
});
