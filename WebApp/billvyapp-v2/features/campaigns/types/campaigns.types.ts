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

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type CampaignType = 'SALON' | 'SERVICE' | 'OFFER' | 'EVENT';
export type CampaignAudience = 'ALL_CUSTOMERS' | 'NEW_CUSTOMERS' | 'EXISTING_CUSTOMERS' | 'SALON_CUSTOMERS';
export type CampaignChannel = 'PUSH' | 'IN_APP';
export type Campaign = { id: string; salonId: string; name: string; description: string | null; type: CampaignType; targetAudience: CampaignAudience; startDate: string | null; endDate: string | null; status: CampaignStatus; offerDescription: string | null; promotionalMediaFileId: string | null; message: string | null; deliveryChannels: CampaignChannel[]; salon: { id: string; name: string }; createdAt: string; updatedAt: string };
export type CampaignInput = Omit<Campaign, 'id' | 'status' | 'salon' | 'createdAt' | 'updatedAt'>;

export type CampaignListRow = {
  campaign: Campaign;
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
  /** Retained for the empty-state component contract. */
  apiUnavailable: boolean;
};
