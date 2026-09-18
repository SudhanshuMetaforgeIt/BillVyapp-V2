'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCampaignsPage } from '../services/campaigns.service';
import type { CampaignsListParams } from '../types/campaigns.types';

export const CAMPAIGNS_QUERY_KEY = ['campaigns', 'manager'] as const;

export function useCampaigns(params: CampaignsListParams) {
  return useQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, params],
    queryFn: () => fetchCampaignsPage(params),
  });
}
