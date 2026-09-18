import { api } from '@/services/api-client';
import type {
  CreateServicePayload,
  ServiceCategoryItem,
  ServiceItem,
  ServicesFilterState,
  ServiceStats,
} from '../types/services.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RawService = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number | string;
  taxRate?: number | string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RawCategory = {
  id: string;
  salonId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

type RawSalon = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type AdminServicesResult = {
  services: ServiceItem[];
  stats: ServiceStats;
  total: number;
  totalPages: number;
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
};

export async function fetchAdminServices(
  filters: Partial<ServicesFilterState>,
): Promise<AdminServicesResult> {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
  };

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.categoryId && filters.categoryId !== 'all') {
    params.categoryId = filters.categoryId;
  }
  if (filters.branchId && filters.branchId !== 'all') {
    params.salonId = filters.branchId;
  }
  if (filters.status === 'active') {
    params.isActive = true;
  } else if (filters.status === 'inactive') {
    params.isActive = false;
  }

  const [servicesRes, allServicesCountRes, activeServicesCountRes, categoriesRes, salonsRes] =
    await Promise.allSettled([
      api.get<PaginatedResponse<RawService>>('/services', { params }),
      api.get<PaginatedResponse<RawService>>('/services', { params: { page: 1, limit: 1 } }),
      api.get<PaginatedResponse<RawService>>('/services', {
        params: { page: 1, limit: 1, isActive: true },
      }),
      api.get<PaginatedResponse<RawCategory>>('/service-categories', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawSalon>>('/salons', {
        params: { page: 1, limit: 100 },
      }),
    ]);

  const getArray = <T>(res: PromiseSettledResult<unknown>): T[] => {
    if (
      res.status === 'fulfilled' &&
      res.value &&
      typeof res.value === 'object' &&
      'data' in res.value &&
      Array.isArray((res.value as { data: unknown }).data)
    ) {
      return (res.value as { data: T[] }).data;
    }
    return [];
  };

  const getTotal = (res: PromiseSettledResult<unknown>): number => {
    if (
      res.status === 'fulfilled' &&
      res.value &&
      typeof res.value === 'object' &&
      'meta' in res.value &&
      res.value.meta &&
      typeof (res.value.meta as { total?: unknown }).total === 'number'
    ) {
      return (res.value.meta as { total: number }).total;
    }
    return 0;
  };

  const rawServices = getArray<RawService>(servicesRes);
  const categoriesList = getArray<RawCategory>(categoriesRes);
  const salonsList = getArray<RawSalon>(salonsRes);

  const categoryMap = new Map(categoriesList.map((c) => [c.id, c.name]));
  const salonMap = new Map(salonsList.map((s) => [s.id, s.name]));

  const services: ServiceItem[] = rawServices.map((s) => ({
    id: s.id,
    name: s.name,
    categoryName: categoryMap.get(s.categoryId) || 'General',
    categoryId: s.categoryId,
    branchName: salonMap.get(s.salonId) || 'All Branches',
    salonId: s.salonId,
    price: Number(s.price) || 0,
    durationMinutes: s.durationMinutes,
    isActive: s.isActive,
    description: s.description,
    createdAt: s.createdAt,
  }));

  const totalServices = getTotal(allServicesCountRes);
  const activeServices = getTotal(activeServicesCountRes);
  const inactiveServices = Math.max(totalServices - activeServices, 0);

  // Compute average price from returned services or 0 if none
  const avgPrice =
    services.length > 0
      ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length)
      : 0;

  const stats: ServiceStats = {
    totalServices,
    activeServices,
    inactiveServices,
    averagePrice: avgPrice,
  };

  const totalPages =
    servicesRes.status === 'fulfilled' &&
    servicesRes.value &&
    typeof servicesRes.value === 'object' &&
    'meta' in servicesRes.value &&
    servicesRes.value.meta
      ? (servicesRes.value.meta as { totalPages: number }).totalPages
      : 1;

  return {
    services,
    stats,
    total: getTotal(servicesRes),
    totalPages: totalPages || 1,
    categories: categoriesList.map((c) => ({ id: c.id, name: c.name })),
    branches: salonsList.map((s) => ({ id: s.id, name: s.name })),
  };
}

export async function createService(payload: CreateServicePayload): Promise<ServiceItem> {
  const res = await api.post<RawService>('/services', payload);
  return {
    id: res.id,
    name: res.name,
    categoryName: 'General',
    categoryId: res.categoryId,
    branchName: 'Branch',
    salonId: res.salonId,
    price: Number(res.price) || 0,
    durationMinutes: res.durationMinutes,
    isActive: res.isActive,
    description: res.description,
    createdAt: res.createdAt,
  };
}

export async function toggleServiceStatus(id: string, isActive: boolean): Promise<void> {
  await api.patch(`/services/${id}/status`, { isActive });
}

export async function fetchServiceCategories(): Promise<ServiceCategoryItem[]> {
  try {
    const res = await api.get<PaginatedResponse<RawCategory>>('/service-categories', {
      params: { page: 1, limit: 100 },
    });
    return (res.data || []).map((c) => ({
      id: c.id,
      name: c.name,
      salonId: c.salonId,
      description: c.description,
      servicesCount: 0,
      isActive: c.isActive,
    }));
  } catch {
    return [];
  }
}

export async function createServiceCategory(data: {
  salonId: string;
  name: string;
  description?: string;
}): Promise<ServiceCategoryItem> {
  const res = await api.post<RawCategory>('/service-categories', data);
  return {
    id: res.id,
    name: res.name,
    salonId: res.salonId,
    description: res.description,
    servicesCount: 0,
    isActive: res.isActive,
  };
}
