export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CampaignStatusTab =
  | 'all'
  | 'active'
  | 'upcoming'
  | 'completed'
  | 'draft';

export type CampaignListRow = {
  id: string;
  name: string;
  description: string;
  typeLabel: string;
  typeTone: 'discount' | 'referral' | 'occasion' | 'promotion' | 'loyalty';
  periodLabel: string;
  audienceLabel: string;
  status: CampaignStatusTab;
  statusLabel: string;
};

export type CampaignsListParams = {
  page: number;
  limit: number;
  search: string;
  statusTab: CampaignStatusTab;
};

export type CampaignsPageData = {
  rows: CampaignListRow[];
  meta: PaginationMeta;
  metrics: import('@/features/dashboard/services/dashboard.service').DashboardMetric[];
  summary: Array<{ status: string; count: number; tone: string }>;
  /** True until a campaigns API exists on the backend. */
  apiUnavailable: boolean;
};
