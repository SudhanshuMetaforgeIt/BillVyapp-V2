'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchMembershipsPage } from '../services/memberships.service';
import type { MembershipsListParams } from '../types/memberships.types';

export const MEMBERSHIPS_QUERY_KEY = ['memberships', 'manager'] as const;

export function useMemberships(params: MembershipsListParams) {
  return useScopedQuery([...MEMBERSHIPS_QUERY_KEY, params], () => fetchMembershipsPage(params), {
    capability: 'memberships.read',
  });
}
