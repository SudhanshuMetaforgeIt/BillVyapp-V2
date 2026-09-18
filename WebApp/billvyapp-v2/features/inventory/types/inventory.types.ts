export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type StockStatusFilter = 'all' | 'low' | 'out' | 'healthy';

export type InventoryApiItem = {
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  productSku: string;
  reorderLevel: number;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: string;
  lastPurchasePrice: string | null;
  lastStockedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductApiItem = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  taxRate: string;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategoryApiItem = {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type StockStatus = 'out' | 'low' | 'healthy';

export type InventoryListRow = {
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  productSku: string;
  categoryLabel: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  averageCostLabel: string;
  lastPurchasePriceLabel: string;
  lastStockedLabel: string;
  stockStatus: StockStatus;
  stockStatusLabel: string;
};

export type InventoryListParams = {
  page: number;
  limit: number;
  search: string;
  stockStatus: StockStatusFilter;
  categoryId: string;
};

export type InventoryPageData = {
  rows: InventoryListRow[];
  meta: PaginationMeta;
  metrics: import('@/features/dashboard/services/dashboard.service').DashboardMetric[];
  categoryOptions: Array<{ id: string; name: string }>;
  productOptions: Array<{ id: string; name: string; sku: string }>;
};

export type AdjustStockPayload = {
  salonId: string;
  productId: string;
  quantity: number;
  movementType:
    | 'ADJUSTMENT'
    | 'DAMAGE'
    | 'RETURN'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT';
  notes?: string | null;
};

export type CreateProductPayload = {
  salonId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  unit?: string;
  costPrice?: number;
  sellingPrice: number;
  taxRate?: number;
  reorderLevel?: number;
};
