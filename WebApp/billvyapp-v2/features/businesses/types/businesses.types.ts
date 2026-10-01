import type {
  FranchiseListItem,
  PaginatedResponse,
  PaginationMeta,
} from '@/features/dashboard/types/dashboard.types';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';

export type { FranchiseListItem, PaginatedResponse, PaginationMeta, DashboardMetric };

export type BusinessStatus = 'active' | 'pending' | 'suspended';

export type BusinessPlanTone = 'basic' | 'professional' | 'enterprise' | 'unknown';

export type BusinessListRow = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  ownerLabel: string;
  planLabel: string;
  planTone: BusinessPlanTone;
  status: BusinessStatus;
  statusLabel: string;
  isActive: boolean;
  joinedOn: string;
  subscriptionActive: boolean;
  subscriptionEndsAt: string | null;
};

export type UpdateBusinessPayload = {
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
};

export type BusinessStatusFilter = 'all' | BusinessStatus;

export type BusinessPlanFilter = 'all' | 'basic' | 'professional' | 'enterprise';

export type BusinessesListParams = {
  page: number;
  limit: number;
  search: string;
  status: BusinessStatusFilter;
  plan: BusinessPlanFilter;
};

export type BusinessSummarySlice = {
  key: BusinessStatus;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type PlanMixItem = {
  id: string;
  label: string;
  count: number;
  percent: number;
};

export type BusinessesPageData = {
  metrics: DashboardMetric[];
  rows: BusinessListRow[];
  meta: PaginationMeta;
  summary: BusinessSummarySlice[];
  planMix: PlanMixItem[];
  total: number;
};

export type CreateBusinessPayload = {
  name: string;
  code: string;
  phone?: string;
  email?: string;
};
