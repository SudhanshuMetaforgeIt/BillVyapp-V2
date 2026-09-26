import { api } from '@/services/api-client';
import type {
  CreatePurchaseInput,
  Paginated,
  Product,
  ProductVendor,
  Purchase,
  PurchaseStatus,
  Vendor,
  VendorInput,
} from '@/types/models';

export type VendorQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

export function listVendors(query: VendorQuery) {
  return api.get<Paginated<Vendor>>('/vendors', {
    params: { ...query, search: query.search?.trim() || undefined },
  });
}

export function createVendor(input: VendorInput) {
  return api.post<Vendor>('/vendors', input);
}

export function updateVendor(id: string, input: Partial<VendorInput>) {
  return api.patch<Vendor>(`/vendors/${id}`, input);
}

export function updateVendorStatus(id: string, isActive: boolean) {
  return api.patch<Vendor>(`/vendors/${id}/status`, { isActive });
}

export type PurchaseQuery = {
  page: number;
  limit: number;
  salonId?: string;
  vendorId?: string;
  status?: PurchaseStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export function listPurchases(query: PurchaseQuery) {
  return api.get<Paginated<Purchase>>('/purchases', {
    params: {
      ...query,
      salonId: query.salonId || undefined,
      vendorId: query.vendorId || undefined,
      status: query.status || undefined,
      search: query.search?.trim() || undefined,
    },
  });
}

export function getPurchase(id: string) {
  return api.get<Purchase>(`/purchases/${id}`);
}

export function createPurchase(input: CreatePurchaseInput) {
  return api.post<Purchase>('/purchases', input);
}

/** Moving to RECEIVED makes the backend post stock; the UI only requests it. */
export function updatePurchaseStatus(id: string, status: PurchaseStatus) {
  return api.patch<Purchase>(`/purchases/${id}/status`, { status });
}

/** Mirror of the backend transition table, for choosing which actions to show. */
export const PURCHASE_NEXT_STATUSES: Record<PurchaseStatus, PurchaseStatus[]> = {
  DRAFT: ['ORDERED', 'CANCELLED'],
  ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

export function searchProducts(salonId: string, search: string) {
  return api.get<Paginated<Product>>('/products', {
    params: { page: 1, limit: 20, salonId, isActive: true, search: search.trim() || undefined },
  });
}

export function listProductVendors(productId: string, page = 1, limit = 20) {
  return api.get<Paginated<ProductVendor>>(`/products/${productId}/vendors`, {
    params: { page, limit },
  });
}

export function linkProductVendor(
  productId: string,
  input: {
    vendorId: string;
    vendorProductCode?: string | null;
    purchasePrice?: number | null;
    isPreferred?: boolean;
  },
) {
  return api.post<ProductVendor>(`/products/${productId}/vendors`, input);
}

export function unlinkProductVendor(productId: string, id: string) {
  return api.delete<void>(`/products/${productId}/vendors/${id}`);
}
