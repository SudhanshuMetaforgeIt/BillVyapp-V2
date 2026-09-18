import { format, isValid, parseISO } from 'date-fns';

import { api } from '@/services/api-client';
import { formatCurrency } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  AdjustStockPayload,
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

function stockStatus(row: InventoryApiItem): StockStatus {
  if (row.quantityOnHand <= 0) return 'out';
  if (row.quantityOnHand <= row.reorderLevel) return 'low';
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
): InventoryListRow {
  const status = stockStatus(row);
  return {
    id: row.id,
    salonId: row.salonId,
    productId: row.productId,
    productName: row.productName,
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

function buildMetrics(
  candidates: InventoryApiItem[],
  totalSkus: number,
  lowStockTotal: number,
  candidatesComplete: boolean,
): DashboardMetric[] {
  const outOfStock = candidates.filter((row) => row.quantityOnHand <= 0).length;
  const unitsOnHand = candidates.reduce(
    (sum, row) => sum + row.quantityOnHand,
    0,
  );

  return [
    {
      id: 'inv-total',
      label: 'Total SKUs',
      value: String(totalSkus),
      rawValue: totalSkus,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'inv-low',
      label: 'Low Stock',
      value: String(lowStockTotal),
      rawValue: lowStockTotal,
      comparisonLabel: 'at or below reorder',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'inv-out',
      label: 'Out of Stock',
      value: String(outOfStock),
      rawValue: outOfStock,
      comparisonLabel: candidatesComplete
        ? 'current total'
        : 'from recent inventory',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: !candidatesComplete,
    },
    {
      id: 'inv-units',
      label: 'Units On Hand',
      value: String(unitsOnHand),
      rawValue: unitsOnHand,
      comparisonLabel: candidatesComplete
        ? 'sum of stock'
        : 'from recent inventory',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: !candidatesComplete,
    },
  ];
}

export async function fetchInventoryPage(
  params: InventoryListParams,
): Promise<InventoryPageData> {
  const needsClientFilter =
    Boolean(params.search.trim()) ||
    Boolean(params.categoryId) ||
    params.stockStatus === 'out' ||
    params.stockStatus === 'healthy';

  const useServerLowOnly =
    params.stockStatus === 'low' && !needsClientFilter;

  const [
    listPage,
    lowStockMetaPage,
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
            ...(useServerLowOnly ? { lowStock: true } : {}),
          },
        }),
    api.get<PaginatedResponse<InventoryApiItem>>('/inventory', {
      params: { page: 1, limit: 1, lowStock: true },
    }),
    api.get<PaginatedResponse<InventoryApiItem>>('/inventory', {
      params: { page: 1, limit: 100 },
    }),
    api.get<PaginatedResponse<ProductApiItem>>('/products', {
      params: { page: 1, limit: 100, isActive: true },
    }),
    api.get<PaginatedResponse<ProductCategoryApiItem>>('/product-categories', {
      params: { page: 1, limit: 100, isActive: true },
    }),
  ]);

  const candidates = candidatesPage.data;
  const candidatesComplete =
    candidatesPage.meta.total <= candidatesPage.data.length;

  const categoryById = new Map(
    categoriesPage.data.map((cat) => [cat.id, cat.name]),
  );
  const categoryByProductId = new Map(
    productsPage.data.map((product) => [
      product.id,
      categoryById.get(product.categoryId) ?? '—',
    ]),
  );
  const productIdsInCategory = params.categoryId
    ? new Set(
        productsPage.data
          .filter((p) => p.categoryId === params.categoryId)
          .map((p) => p.id),
      )
    : null;

  const metrics = buildMetrics(
    candidates,
    candidatesPage.meta.total,
    lowStockMetaPage.meta.total,
    candidatesComplete,
  );

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
      const status = stockStatus(row);
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
      rows: pageRows.map((row) => mapRow(row, categoryByProductId)),
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
    rows: listPage.data.map((row) => mapRow(row, categoryByProductId)),
    meta: listPage.meta,
    metrics,
    categoryOptions,
    productOptions,
  };
}

export async function adjustStock(payload: AdjustStockPayload) {
  return api.post<InventoryApiItem>('/inventory/adjust', payload);
}

export async function createProduct(payload: CreateProductPayload) {
  return api.post<ProductApiItem>('/products', payload);
}
