import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type { PaginationMeta } from '@/features/dashboard/types/dashboard.types';

export type { DashboardMetric, PaginationMeta };

export type PlanStatus = 'active' | 'inactive';
export type PlanStatusFilter = 'all' | PlanStatus;
export type BillingCycle = 'monthly' | 'yearly' | 'custom';

export type PlanIconKey =
  | 'basic'
  | 'professional'
  | 'premium'
  | 'enterprise'
  | 'custom';

export type PlatformPlan = {
  id: string;
  name: string;
  description: string;
  /** null means custom / contact pricing */
  priceMonthly: number | null;
  billingCycle: BillingCycle;
  billingCycleLabel: string;
  businessCount: number;
  status: PlanStatus;
  iconKey: PlanIconKey;
  features: string[];
  isCustom: boolean;
};

export type PlansListParams = {
  page: number;
  limit: number;
  search: string;
  status: PlanStatusFilter;
};

export type PlanPriceSlice = {
  id: string;
  label: string;
  priceLabel: string;
  percent: number;
  color: string;
};

export type PlansPageData = {
  metrics: DashboardMetric[];
  rows: PlatformPlan[];
  meta: PaginationMeta;
  priceOverview: PlanPriceSlice[];
  averagePrice: number;
};

export type CreatePlanPayload = {
  name: string;
  priceMonthly: number | null;
  billingCycle: BillingCycle;
  isCustom: boolean;
  status: PlanStatus;
};
