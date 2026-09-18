import { api } from '@/services/api-client';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  BusinessesListParams,
  BusinessesPageData,
  BusinessListRow,
  BusinessStatusFilter,
  CreateBusinessPayload,
  FranchiseListItem,
  PaginatedResponse,
  PlanMixItem,
} from '../types/businesses.types';

function mapStatus(isActive: boolean): Pick<
  BusinessListRow,
  'status' | 'statusLabel'
> {
  // Franchise API only exposes isActive. Inactive is shown as Suspended;
  // Pending is reserved for a future onboarding workflow.
  if (isActive) {
    return { status: 'active', statusLabel: 'Active' };
  }
  return { status: 'suspended', statusLabel: 'Suspended' };
}

function mapFranchiseRow(row: FranchiseListItem): BusinessListRow {
  const status = mapStatus(row.isActive);

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    ownerLabel: row.email ?? row.phone ?? '—',
    // Plans are not on the franchise API yet.
    planLabel: '—',
    planTone: 'unknown',
    status: status.status,
    statusLabel: status.statusLabel,
    joinedOn: row.createdAt,
  };
}

function statusToIsActive(
  status: BusinessStatusFilter,
): boolean | undefined {
  if (status === 'active') return true;
  if (status === 'suspended') return false;
  if (status === 'pending') return undefined;
  return undefined;
}

async function fetchCounts() {
  const [totalPage, activePage, inactivePage] = await Promise.all([
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 1 },
    }),
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 1, isActive: true },
    }),
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 1, isActive: false },
    }),
  ]);

  return {
    total: totalPage.meta.total,
    active: activePage.meta.total,
    suspended: inactivePage.meta.total,
    pending: 0,
  };
}

function buildMetrics(counts: {
  total: number;
  active: number;
  pending: number;
  suspended: number;
}): DashboardMetric[] {
  return [
    {
      id: 'total-businesses',
      label: 'Total Businesses',
      value: String(counts.total),
      rawValue: counts.total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'active-businesses',
      label: 'Active Businesses',
      value: String(counts.active),
      rawValue: counts.active,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'pending-businesses',
      label: 'Pending Businesses',
      value: String(counts.pending),
      rawValue: counts.pending,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'suspended-businesses',
      label: 'Suspended Businesses',
      value: String(counts.suspended),
      rawValue: counts.suspended,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];
}

function buildSummary(counts: {
  total: number;
  active: number;
  pending: number;
  suspended: number;
}) {
  const denom = Math.max(counts.total, 1);
  return [
    {
      key: 'active' as const,
      label: 'Active',
      count: counts.active,
      percent: (counts.active / denom) * 100,
      color: 'var(--bv-emerald)',
    },
    {
      key: 'pending' as const,
      label: 'Pending',
      count: counts.pending,
      percent: (counts.pending / denom) * 100,
      color: 'var(--bv-warning, #d97706)',
    },
    {
      key: 'suspended' as const,
      label: 'Suspended',
      count: counts.suspended,
      percent: (counts.suspended / denom) * 100,
      color: 'var(--bv-danger)',
    },
  ];
}

const EMPTY_PLAN_MIX: PlanMixItem[] = [];

/**
 * Loads the Super Admin businesses page from `/franchises`.
 */
export async function fetchBusinessesPage(
  params: BusinessesListParams,
): Promise<BusinessesPageData> {
  const isActive = statusToIsActive(params.status);

  if (params.status === 'pending') {
    const counts = await fetchCounts();
    return {
      metrics: buildMetrics(counts),
      rows: [],
      meta: {
        page: 1,
        limit: params.limit,
        total: 0,
        totalPages: 0,
      },
      summary: buildSummary(counts),
      planMix: EMPTY_PLAN_MIX,
      total: counts.total,
    };
  }

  const listParams: Record<string, string | number | boolean> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search.trim()) listParams.search = params.search.trim();
  if (typeof isActive === 'boolean') listParams.isActive = isActive;

  // Plan filter has no API field — ignore until subscriptions exist.
  const [listPage, counts] = await Promise.all([
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: listParams,
    }),
    fetchCounts(),
  ]);

  return {
    metrics: buildMetrics(counts),
    rows: listPage.data.map(mapFranchiseRow),
    meta: listPage.meta,
    summary: buildSummary(counts),
    planMix: EMPTY_PLAN_MIX,
    total: counts.total,
  };
}

export async function createBusiness(
  payload: CreateBusinessPayload,
): Promise<FranchiseListItem> {
  return api.post<FranchiseListItem>('/franchises', {
    name: payload.name.trim(),
    code: payload.code.trim().toUpperCase(),
    phone: payload.phone?.trim() || undefined,
    email: payload.email?.trim() || undefined,
  });
}
