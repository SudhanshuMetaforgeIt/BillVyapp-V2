import { format, isValid, parseISO } from 'date-fns';

import { api } from '@/services/api-client';
import { formatCurrency, formatQuantity } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  AdjustStockPayload,
  CreateProductCategoryPayload,
  CreateProductPayload,
  InventoryApiItem,
  InventoryListParams,
  InventoryListRow,
  InventoryPageData,
  PaginatedResponse,
  ProductApiItem,
  ProductCategoryApiItem,
  StockStatus,
} from '../types/inventory.types';

function stockStatus(row: InventoryApiItem, categoryName?: string): StockStatus {
  if (row.quantityOnHand <= 0) return 'out';
  const isConsumable = /^consumables?$/i.test(categoryName?.trim() ?? '');
  if (isConsumable && row.quantityOnHand <= row.reorderLevel) return 'low';
  return 'healthy';
}

function stockStatusLabel(status: StockStatus): string {
  if (status === 'out') return 'Out of Stock';
  if (status === 'low') return 'Low Stock';
  return 'In Stock';
}

function formatLastStocked(value: string | null): string {
  if (!value) return '—';
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd MMM yyyy, h:mm a') : '—';
}

function mapRow(
  row: InventoryApiItem,
  categoryByProductId: Map<string, string>,
  descriptionByProductId: Map<string, string | null>,
): InventoryListRow {
  const status = stockStatus(row, categoryByProductId.get(row.productId));
  return {
    id: row.id,
    salonId: row.salonId,
    productId: row.productId,
    stockLabel: `${formatQuantity(row.quantityOnHand * Number(row.packageSize ?? 1))} ${row.measurementUnit ?? "PCS"} / ${formatQuantity(row.quantityOnHand)} packages`,
    productName: row.productName,
    productDescription: descriptionByProductId.get(row.productId),
    productSku: row.productSku,
    categoryLabel: categoryByProductId.get(row.productId) ?? '—',
    quantityOnHand: row.quantityOnHand,
    reservedQuantity: row.reservedQuantity,
    availableQuantity: row.availableQuantity,
    reorderLevel: row.reorderLevel,
    averageCostLabel: formatCurrency(row.averageCost),
    lastPurchasePriceLabel: formatCurrency(row.lastPurchasePrice),
    lastStockedLabel: formatLastStocked(row.lastStockedAt),
    stockStatus: status,
    stockStatusLabel: stockStatusLabel(status),
  };
}

function matchesSearch(row: InventoryApiItem, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    row.productName.toLowerCase().includes(q) ||
    row.productSku.toLowerCase().includes(q)
  );
}

export async function fetchInventoryPage(
  params: InventoryListParams,
): Promise<InventoryPageData> {
  const needsClientFilter =
    Boolean(params.search.trim()) ||
    Boolean(params.categoryId) ||
    params.stockStatus !== 'all';

  const [
    listPage,
    candidatesPage,
    productsPage,
    categoriesPage,
  ] = await Promise.all([
    needsClientFilter
      ? Promise.resolve({
          data: [] as InventoryApiItem[],
          meta: { page: 1, limit: params.limit, total: 0, totalPages: 0 },
        })
      : api.get<PaginatedResponse<InventoryApiItem>>('/inventory', {
          params: {
            page: params.page,
            limit: params.limit,
          },
        }),
    needsClientFilter ? fetchAllInventoryOptions<InventoryApiItem>('/inventory') : Promise.resolve({ data: [] as InventoryApiItem[] }),
    fetchAllInventoryOptions<ProductApiItem>('/products', { isActive: true }),
    fetchAllInventoryOptions<ProductCategoryApiItem>('/product-categories', { isActive: true }),
  ]);

  const candidates = candidatesPage.data;

  const categoryById = new Map(
    categoriesPage.data.map((cat) => [cat.id, cat.name]),
  );
  const categoryByProductId = new Map(
    productsPage.data.map((product) => [
      product.id,
      categoryById.get(product.categoryId) ?? '—',
    ]),
  );
  const descriptionByProductId = new Map(productsPage.data.map((product) => [product.id, product.description]));
  const productIdsInCategory = params.categoryId
    ? new Set(
        productsPage.data
          .filter((p) => p.categoryId === params.categoryId)
          .map((p) => p.id),
      )
    : null;

  const metrics: DashboardMetric[] = [];

  const categoryOptions = categoriesPage.data.map((cat) => ({
    id: cat.id,
    name: cat.name,
  }));
  const productOptions = productsPage.data.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
  }));

  if (needsClientFilter) {
    const filtered = candidates.filter((row) => {
      if (!matchesSearch(row, params.search)) return false;
      if (productIdsInCategory && !productIdsInCategory.has(row.productId)) {
        return false;
      }
      const status = stockStatus(row, categoryByProductId.get(row.productId));
      if (params.stockStatus === 'out') return status === 'out';
      if (params.stockStatus === 'low') return status === 'low';
      if (params.stockStatus === 'healthy') return status === 'healthy';
      return true;
    });

    const total = filtered.length;
    const start = (params.page - 1) * params.limit;
    const pageRows = filtered.slice(start, start + params.limit);
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);

    return {
      rows: pageRows.map((row) => mapRow(row, categoryByProductId, descriptionByProductId)),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
      },
      metrics,
      categoryOptions,
      productOptions,
    };
  }

  return {
    rows: listPage.data.map((row) => mapRow(row, categoryByProductId, descriptionByProductId)),
    meta: listPage.meta,
    metrics,
    categoryOptions,
    productOptions,
  };
}

export async function adjustStock(payload: AdjustStockPayload) {
  return api.post<InventoryApiItem>('/inventory/adjust', payload);
}

/** Load every option so a growing catalog is never silently truncated at 100. */
export async function fetchAllInventoryOptions<T>(path: string, filters: Record<string, string | boolean> = {}) {
  const first = await api.get<PaginatedResponse<T>>(path, { params: { ...filters, page: 1, limit: 100 } });
  const data = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = await api.get<PaginatedResponse<T>>(path, { params: { ...filters, page, limit: 100 } });
    data.push(...next.data);
  }
  return { ...first, data };
}

export async function createProduct(payload: CreateProductPayload) {
  return api.post<ProductApiItem>('/products', payload);
}

export async function createProductCategory(payload: CreateProductCategoryPayload) {
  return api.post<ProductCategoryApiItem>('/product-categories', payload);
}

