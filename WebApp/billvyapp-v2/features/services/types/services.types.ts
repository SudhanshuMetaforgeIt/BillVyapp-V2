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

export type ServicesTab = 'services' | 'categories';

export type ServiceStatusFilter = 'all' | 'active' | 'inactive';

export type ServiceApiItem = {
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
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceListRow = {
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
  categoryOptions: Array<{ id: string; name: string }>;
};

export type CreateServicePayload = {
  salonId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  taxRate?: number;
};

export type CreateServiceCategoryPayload = {
  salonId: string;
  name: string;
  description?: string | null;
};
