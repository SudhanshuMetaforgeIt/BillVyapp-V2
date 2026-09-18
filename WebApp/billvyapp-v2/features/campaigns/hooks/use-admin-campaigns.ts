'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCampaign,
  fetchAdminCampaigns,
} from '../services/admin-campaigns.service';
import type {
  CampaignsFilterState,
  CreateCampaignPayload,
} from '../types/admin-campaigns.types';

export function useAdminCampaigns(
  filters: Partial<CampaignsFilterState> = {},
) {
  return useQuery({
    queryKey: ['admin-campaigns', filters],
    queryFn: () => fetchAdminCampaigns(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
  });
}
