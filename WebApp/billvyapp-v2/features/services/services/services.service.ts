import { api } from '@/services/api-client';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  CreateServiceCategoryPayload,
  CreateServicePayload,
  PaginatedResponse,
  ServiceApiItem,
  ServiceCategoryApiItem,
  ServiceListRow,
  ServicesListParams,
  ServicesPageData,
  CategoryListRow,
} from '../types/services.types';

async function countServices(isActive?: boolean) {
  const page = await api.get<PaginatedResponse<ServiceApiItem>>('/services', {
    params: {
      page: 1,
      limit: 1,
      isActive: isActive === undefined ? undefined : isActive,
    },
  });
  return page.meta.total;
}

function buildMetrics(
  total: number,
  active: number,
  inactive: number,
  candidates: ServiceApiItem[],
  candidatesComplete: boolean,
): DashboardMetric[] {
  const avgPrice =
    candidates.length === 0
      ? 0
      : candidates.reduce((sum, row) => sum + (Number(row.price) || 0), 0) /
        candidates.length;
  const activePct = total > 0 ? (active / total) * 100 : null;
  const inactivePct = total > 0 ? (inactive / total) * 100 : null;

  return [
    {
      id: 'svc-total',
      label: 'Total Services',
      value: String(total),
      rawValue: total,
      comparisonLabel: 'in your salon',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'svc-active',
      label: 'Active Services',
      value: String(active),
      rawValue: active,
      comparisonLabel:
        activePct == null ? 'current total' : `${activePct.toFixed(0)}% of total`,
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'svc-inactive',
      label: 'Inactive Services',
      value: String(inactive),
      rawValue: inactive,
      comparisonLabel:
        inactivePct == null
          ? 'current total'
          : `${inactivePct.toFixed(0)}% of total`,
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'svc-avg',
      label: 'Average Price',
      value: formatCurrency(avgPrice),
      rawValue: avgPrice,
      comparisonLabel: candidatesComplete
        ? 'across all services'
        : 'from recent services',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: !candidatesComplete,
    },
  ];
}

function mapServiceRow(
  row: ServiceApiItem,
  categoryById: Map<string, string>,
): ServiceListRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() || '—',
    categoryId: row.categoryId,
    categoryLabel: categoryById.get(row.categoryId) ?? '—',
    priceLabel: formatCurrency(row.price),
    durationLabel: `${formatNumber(row.durationMinutes)} mins`,
    isActive: row.isActive,
    statusLabel: row.isActive ? 'Active' : 'Inactive',
  };
}

export async function fetchServicesPage(
  params: ServicesListParams,
): Promise<ServicesPageData> {
  const isActive =
    params.status === 'active'
      ? true
      : params.status === 'inactive'
        ? false
        : undefined;

  const [
    servicesPage,
    categoriesPage,
    candidatesPage,
    total,
    active,
    inactive,
  ] = await Promise.all([
    params.tab === 'services'
      ? api.get<PaginatedResponse<ServiceApiItem>>('/services', {
          params: {
            page: params.page,
            limit: params.limit,
            search: params.search.trim() || undefined,
            categoryId: params.categoryId || undefined,
            isActive,
          },
        })
      : Promise.resolve({
          data: [] as ServiceApiItem[],
          meta: { page: 1, limit: params.limit, total: 0, totalPages: 0 },
        }),
    api.get<PaginatedResponse<ServiceCategoryApiItem>>('/service-categories', {
      params: {
        page: params.tab === 'categories' ? params.page : 1,
        limit: params.tab === 'categories' ? params.limit : 100,
        search:
          params.tab === 'categories' && params.search.trim()
            ? params.search.trim()
            : undefined,
        isActive:
          params.tab === 'categories' && isActive !== undefined
            ? isActive
            : undefined,
      },
    }),
    api.get<PaginatedResponse<ServiceApiItem>>('/services', {
      params: { page: 1, limit: 100 },
    }),
    countServices(),
    countServices(true),
    countServices(false),
  ]);

  const allCategories =
    params.tab === 'categories'
      ? (
          await api.get<PaginatedResponse<ServiceCategoryApiItem>>(
            '/service-categories',
            { params: { page: 1, limit: 100 } },
          )
        ).data
      : categoriesPage.data;

  const categoryById = new Map(
    allCategories.map((cat) => [cat.id, cat.name]),
  );

  const candidatesComplete =
    candidatesPage.meta.total <= candidatesPage.data.length;

  const serviceCounts = new Map<string, number>();
  for (const row of candidatesPage.data) {
    serviceCounts.set(
      row.categoryId,
      (serviceCounts.get(row.categoryId) ?? 0) + 1,
    );
  }

  const metrics = buildMetrics(
    total,
    active,
    inactive,
    candidatesPage.data,
    candidatesComplete,
  );

  const categoryOptions = allCategories
    .filter((cat) => cat.isActive)
    .map((cat) => ({ id: cat.id, name: cat.name }));

  const serviceRows = servicesPage.data.map((row) =>
    mapServiceRow(row, categoryById),
  );

  const categoryRows: CategoryListRow[] =
    params.tab === 'categories'
      ? categoriesPage.data.map((cat) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description?.trim() || '—',
          serviceCount: serviceCounts.get(cat.id) ?? 0,
          isActive: cat.isActive,
          statusLabel: cat.isActive ? 'Active' : 'Inactive',
        }))
      : [];

  return {
    serviceRows,
    categoryRows,
    serviceMeta: servicesPage.meta,
    categoryMeta:
      params.tab === 'categories'
        ? categoriesPage.meta
        : { page: 1, limit: params.limit, total: 0, totalPages: 0 },
    metrics,
    categoryOptions,
  };
}

export async function createService(payload: CreateServicePayload) {
  return api.post<ServiceApiItem>('/services', payload);
}

export async function createServiceCategory(
  payload: CreateServiceCategoryPayload,
) {
  return api.post<ServiceCategoryApiItem>('/service-categories', payload);
}

export async function updateServiceStatus(id: string, isActive: boolean) {
  return api.patch<ServiceApiItem>(`/services/${id}/status`, { isActive });
}

export async function updateCategoryStatus(id: string, isActive: boolean) {
  return api.patch<ServiceCategoryApiItem>(
    `/service-categories/${id}/status`,
    { isActive },
  );
}
