import { formatCurrency } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  PlansListParams,
  PlansPageData,
  PlatformPlan,
  PlanPriceSlice,
} from '../types/plans.types';

function buildMetrics(plans: PlatformPlan[]): DashboardMetric[] {
  const total = plans.length;
  const active = plans.filter((p) => p.status === 'active').length;
  const inactive = total - active;
  const priced = plans.filter((p) => p.priceMonthly !== null);
  const avgPrice =
    priced.length === 0
      ? 0
      : priced.reduce((sum, p) => sum + (p.priceMonthly ?? 0), 0) / priced.length;

  return [
    {
      id: 'total-plans',
      label: 'Total Plans',
      value: String(total),
      rawValue: total,
      comparisonLabel: 'current total',
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
 * Platform subscription plans have no API yet. Returns an empty catalogue
 * derived only from whatever plans are loaded (none until an endpoint exists).
 */
export async function fetchPlansPage(
  params: PlansListParams,
): Promise<PlansPageData> {
  const plans: PlatformPlan[] = [];

  const q = params.search.trim().toLowerCase();
  let filtered = plans;
  if (q) {
    filtered = filtered.filter(
      (plan) =>
        plan.name.toLowerCase().includes(q) ||
        plan.description.toLowerCase().includes(q),
    );
  }
  if (params.status !== 'all') {
    filtered = filtered.filter((plan) => plan.status === params.status);
  }

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);
  const page = Math.min(params.page, Math.max(totalPages, 1));
  const start = (page - 1) * params.limit;
  const rows = filtered.slice(start, start + params.limit);
  const overview = buildPriceOverview(plans);

  return {
    metrics: buildMetrics(plans),
    rows,
    meta: {
      page,
      limit: params.limit,
      total,
      totalPages,
    },
    priceOverview: overview.slices,
    averagePrice: overview.averagePrice,
  };
}
