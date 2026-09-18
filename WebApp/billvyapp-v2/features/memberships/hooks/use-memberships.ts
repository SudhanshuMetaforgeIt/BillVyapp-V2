'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMembershipsPage } from '../services/memberships.service';
import type { MembershipsListParams } from '../types/memberships.types';

export const MEMBERSHIPS_QUERY_KEY = ['memberships', 'manager'] as const;

export function useMemberships(params: MembershipsListParams) {
  return useQuery({
    queryKey: [...MEMBERSHIPS_QUERY_KEY, params],
    queryFn: () => fetchMembershipsPage(params),
  });
}
