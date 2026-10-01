import { formatCurrency } from '@/lib/format';
import { api } from '@/services/api-client';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  BillingCycle,
  CreatePlanPayload,
  PlanIconKey,
  PlansListParams,
  PlansPageData,
  PlatformPlan,
  PlanPriceSlice,
  PlanStatus,
} from '../types/plans.types';

type PlatformPlanApiItem = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: string | null;
  billingCycle: BillingCycle;
  isCustom: boolean;
  iconKey: string;
  features: string[] | null;
  isActive: boolean;
  businessCount: number;
  createdAt: string;
  updatedAt: string;
};

type PaginatedPlatformPlans = {
  data: PlatformPlanApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const BILLING_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const ICON_KEYS = new Set<PlanIconKey>([
  'basic',
  'professional',
  'premium',
  'enterprise',
  'custom',
]);

function mapIconKey(raw: string, isCustom: boolean): PlanIconKey {
  if (isCustom) return 'custom';
  const key = raw.trim().toLowerCase() as PlanIconKey;
  return ICON_KEYS.has(key) ? key : 'basic';
}

function mapPlan(row: PlatformPlanApiItem): PlatformPlan {
  const priceMonthly =
    row.priceMonthly === null || row.priceMonthly === ''
      ? null
      : Number(row.priceMonthly);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    priceMonthly:
      priceMonthly !== null && Number.isFinite(priceMonthly)
        ? priceMonthly
        : null,
    billingCycle: row.billingCycle,
    billingCycleLabel: BILLING_LABELS[row.billingCycle] ?? row.billingCycle,
    businessCount: row.businessCount ?? 0,
    status: (row.isActive ? 'active' : 'inactive') as PlanStatus,
    iconKey: mapIconKey(row.iconKey, row.isCustom),
    features: row.features ?? [],
    isCustom: row.isCustom,
  };
}

function buildMetrics(plans: PlatformPlan[]): DashboardMetric[] {
  const total = plans.length;
  const active = plans.filter((p) => p.status === 'active').length;
  const inactive = total - active;
  const priced = plans.filter((p) => p.priceMonthly !== null);
  const avgPrice =
    priced.length === 0
      ? 0
      : priced.reduce((sum, p) => sum + (p.priceMonthly ?? 0), 0) / priced.length;

  const enrolledBusinesses = plans.reduce(
    (sum, p) => sum + Math.max(p.businessCount, 0),
    0,
  );
  const subscriptionRevenue = plans.reduce((sum, plan) => {
    if (plan.priceMonthly === null || plan.priceMonthly <= 0) return sum;
    if (plan.businessCount <= 0) return sum;
    const monthlyRate =
      plan.billingCycle === 'yearly'
        ? plan.priceMonthly / 12
        : plan.priceMonthly;
    return sum + monthlyRate * plan.businessCount;
  }, 0);

  return [
    {
      id: 'subscription-revenue',
      label: 'Subscription Revenue',
      value: String(subscriptionRevenue),
      rawValue: subscriptionRevenue,
      comparisonLabel:
        enrolledBusinesses > 0
          ? `${enrolledBusinesses} enrolled business${enrolledBusinesses === 1 ? '' : 'es'} (MRR)`
          : 'from active plan enrollments',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'active-plans',
      label: 'Active Plans',
      value: String(active),
      rawValue: active,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'inactive-plans',
      label: 'Inactive Plans',
      value: String(inactive),
      rawValue: inactive,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'avg-plan-price',
      label: 'Avg. Plan Price',
      value: String(avgPrice),
      rawValue: avgPrice,
      comparisonLabel: 'current average',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
  ];
}

function buildPriceOverview(plans: PlatformPlan[]): {
  slices: PlanPriceSlice[];
  averagePrice: number;
} {
  const priced = plans.filter(
    (p) => p.priceMonthly !== null && p.priceMonthly > 0,
  );
  const totalPrice = priced.reduce((sum, p) => sum + (p.priceMonthly ?? 0), 0);
  const denom = Math.max(totalPrice, 1);
  const averagePrice = priced.length === 0 ? 0 : totalPrice / priced.length;

  const palette = [
    'var(--bv-brand-orange)',
    'var(--bv-champagne)',
    'var(--bv-emerald)',
    '#35507a',
    'var(--bv-warning)',
  ];

  const slices: PlanPriceSlice[] = plans.map((plan, index) => {
    const price = plan.priceMonthly ?? 0;
    return {
      id: plan.id,
      label: plan.name,
      priceLabel:
        plan.priceMonthly === null
          ? 'Custom'
          : formatCurrency(plan.priceMonthly),
      percent: plan.priceMonthly === null ? 0 : (price / denom) * 100,
      color: palette[index % palette.length]!,
    };
  });

  return { slices, averagePrice };
}

/**
 * Loads Super Admin Plans & Pricing from `/platform-plans`.
 * Metrics / price overview use a wider fetch so KPI cards stay accurate
 * while the table stays paginated.
 */
export async function fetchPlansPage(
  params: PlansListParams,
): Promise<PlansPageData> {
  const listParams: Record<string, string | number | boolean> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search.trim()) listParams.search = params.search.trim();
  if (params.status === 'active') listParams.isActive = true;
  if (params.status === 'inactive') listParams.isActive = false;

  const overviewParams: Record<string, string | number | boolean> = {
    page: 1,
    limit: 100,
  };
  if (params.search.trim()) overviewParams.search = params.search.trim();

  const [listPage, overviewPage] = await Promise.all([
    api.get<PaginatedPlatformPlans>('/platform-plans', { params: listParams }),
    api.get<PaginatedPlatformPlans>('/platform-plans', {
      params: overviewParams,
    }),
  ]);

  const rows = listPage.data.map(mapPlan);
  const overviewPlans = overviewPage.data.map(mapPlan);
  const overview = buildPriceOverview(overviewPlans);

  return {
    metrics: buildMetrics(overviewPlans),
    rows,
    meta: listPage.meta,
    priceOverview: overview.slices,
    averagePrice: overview.averagePrice,
  };
}

export async function createPlan(
  payload: CreatePlanPayload,
): Promise<PlatformPlan> {
  const created = await api.post<PlatformPlanApiItem>('/platform-plans', {
    name: payload.name.trim(),
    isCustom: payload.isCustom,
    priceMonthly: payload.isCustom ? undefined : payload.priceMonthly,
    billingCycle: payload.billingCycle,
    isActive: payload.status === 'active',
  });
  return mapPlan(created);
}

export async function updatePlan(
  id: string,
  payload: CreatePlanPayload,
): Promise<PlatformPlan> {
  const updated = await api.patch<PlatformPlanApiItem>(`/platform-plans/${id}`, {
    name: payload.name.trim(),
    isCustom: payload.isCustom,
    priceMonthly: payload.isCustom ? null : payload.priceMonthly,
    billingCycle: payload.billingCycle,
  });
  return mapPlan(updated);
}

export async function updatePlanStatus(
  id: string,
  isActive: boolean,
): Promise<PlatformPlan> {
  const updated = await api.patch<PlatformPlanApiItem>(
    `/platform-plans/${id}/status`,
    { isActive },
  );
  return mapPlan(updated);
}
