import type { Gender } from '@/lib/gender';
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

export type ServicesTab = 'services' | 'categories' | 'gender';

export type ServiceStatusFilter = 'all' | 'active' | 'inactive';

export type ServiceApiItem = {
  gender: Gender;
  productRecipe?: import("../components/product-recipe-editor").ProductRecipe[];
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  taxRate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceCategoryApiItem = {
  gender: Gender;
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceListRow = {
  gender: Gender;
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
  priceLabel: string;
  durationLabel: string;
  isActive: boolean;
  statusLabel: string;
};

export type CategoryListRow = {
  gender: Gender;
  id: string;
  name: string;
  description: string;
  serviceCount: number;
  isActive: boolean;
  statusLabel: string;
};

export type ServicesListParams = {
  tab: ServicesTab;
  page: number;
  limit: number;
  search: string;
  categoryId: string;
  status: ServiceStatusFilter;
};

export type ServicesPageData = {
  serviceRows: ServiceListRow[];
  categoryRows: CategoryListRow[];
  serviceMeta: PaginationMeta;
  categoryMeta: PaginationMeta;
  metrics: import('@/features/dashboard/services/dashboard.service').DashboardMetric[];
  categoryOptions: Array<{ id: string; name: string; gender: Gender }>;
};

export type CreateServicePayload = {
  gender: Gender;
  productRecipe?: import("../components/product-recipe-editor").ProductRecipe[];
  salonId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  taxRate?: number;
};

export type CreateServiceCategoryPayload = {
  gender: Gender;
  salonId: string;
  name: string;
  description?: string | null;
};

export type UpdateServicePayload = Omit<CreateServicePayload, 'salonId'>;
