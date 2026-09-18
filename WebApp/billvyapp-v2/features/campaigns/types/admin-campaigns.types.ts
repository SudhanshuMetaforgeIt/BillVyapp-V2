export type CampaignStatus = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'DRAFT';
export type CampaignType =
  | 'DISCOUNT'
  | 'REFERRAL'
  | 'OCCASION'
  | 'PROMOTION'
  | 'LOYALTY';

export type CampaignStats = {
  totalCampaigns: number;
  totalCampaignsSubtitle: string;
  activeCampaigns: number;
  activeCampaignsPct: number;
  upcomingCampaigns: number;
  upcomingCampaignsPct: number;
  completedCampaigns: number;
  completedCampaignsPct: number;
  draftCampaigns: number;
};

export type CampaignItem = {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  branchName: string;
  salonId?: string | null;
  period: string;
  startDate: string;
  endDate: string;
  audience: number | null;
  status: CampaignStatus;
  createdAt: string;
};

export type CampaignsFilterState = {
  search: string;
  statusTab: 'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'DRAFT';
  branchId: string;
  page: number;
  limit: number;
};

export type CreateCampaignPayload = {
  name: string;
  description: string;
  type: CampaignType;
  salonId?: string;
  startDate: string;
  endDate: string;
  audience?: number;
  status?: CampaignStatus;
};

export type AdminCampaignsResult = {
  campaigns: CampaignItem[];
  stats: CampaignStats;
  total: number;
  totalPages: number;
  branches: { id: string; name: string }[];
};
