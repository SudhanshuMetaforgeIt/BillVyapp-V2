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
  UpdateBusinessPayload,
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

function planToneFromName(name: string | null | undefined): BusinessPlanTone {
  if (!name) return 'unknown';
  const lower = name.toLowerCase();
  if (lower.includes('enterprise') || lower.includes('custom')) return 'enterprise';
  if (lower.includes('pro')) return 'professional';
  if (lower.includes('basic')) return 'basic';
  return 'professional';
}

function mapFranchiseRow(row: FranchiseListItem): BusinessListRow {
  const status = mapStatus(row.isActive);
  const planName = row.currentPlanName?.trim() || null;

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    email: row.email,
    phone: row.phone,
    ownerLabel: row.email ?? row.phone ?? '—',
    planLabel: planName
      ? row.subscriptionActive
        ? planName
        : `${planName} (inactive)`
      : 'Not enrolled',
    planTone: planToneFromName(planName),
    status: status.status,
    statusLabel: status.statusLabel,
    isActive: row.isActive,
    joinedOn: row.createdAt,
    subscriptionActive: Boolean(row.subscriptionActive),
    subscriptionEndsAt: row.subscriptionEndsAt ?? null,
  };
}

function buildPlanMix(rows: FranchiseListItem[]): PlanMixItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.subscriptionActive || !row.currentPlanName) continue;
    const label = row.currentPlanName;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
  const denom = Math.max(total, 1);
  return Array.from(counts.entries()).map(([label, count], index) => ({
    id: `plan-mix-${index}`,
    label,
    count,
    percent: (count / denom) * 100,
  }));
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

  const [listPage, counts, mixSource] = await Promise.all([
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: listParams,
    }),
    fetchCounts(),
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 100, isActive: true },
    }),
  ]);

  return {
    metrics: buildMetrics(counts),
    rows: listPage.data.map(mapFranchiseRow),
    meta: listPage.meta,
    summary: buildSummary(counts),
    planMix: buildPlanMix(mixSource.data),
    total: counts.total,
  };
}

export type EnrollBusinessPayload = {
  franchiseId: string;
  platformPlanId: string;
  billingCycle: 'monthly' | 'yearly' | 'custom';
  startsAt?: string;
  endsAt?: string;
  notes?: string;
};

export type FranchiseSubscriptionApi = {
  id: string;
  franchiseId: string;
  franchiseName: string;
  platformPlanId: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly' | 'custom';
  status: 'active' | 'expired' | 'cancelled';
  startsAt: string;
  endsAt: string;
  isCurrentlyActive: boolean;
  notes: string | null;
};

export async function enrollBusinessPlan(
  payload: EnrollBusinessPayload,
): Promise<FranchiseSubscriptionApi> {
  return api.post<FranchiseSubscriptionApi>('/franchise-subscriptions', payload);
}

export async function fetchActivePlatformPlans(): Promise<
  { id: string; name: string; billingCycle: string; isCustom: boolean }[]
> {
  const page = await api.get<
    PaginatedResponse<{
      id: string;
      name: string;
      billingCycle: string;
      isCustom: boolean;
      isActive: boolean;
    }>
  >('/platform-plans', { params: { page: 1, limit: 100, isActive: true } });
  return page.data.map((row) => ({
    id: row.id,
    name: row.name,
    billingCycle: row.billingCycle,
    isCustom: row.isCustom,
  }));
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

export async function updateBusiness(
  id: string,
  payload: UpdateBusinessPayload,
): Promise<FranchiseListItem> {
  return api.patch<FranchiseListItem>(`/franchises/${id}`, {
    name: payload.name.trim(),
    code: payload.code.trim().toUpperCase(),
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
  });
}

export async function updateBusinessStatus(
  id: string,
  isActive: boolean,
): Promise<FranchiseListItem> {
  return api.patch<FranchiseListItem>(`/franchises/${id}/status`, { isActive });
}
