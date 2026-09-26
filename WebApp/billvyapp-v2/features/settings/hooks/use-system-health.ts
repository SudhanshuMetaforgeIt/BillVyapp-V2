'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchSystemHealth } from '../services/settings.service';

export const SYSTEM_HEALTH_QUERY_KEY = ['settings', 'system-health'] as const;

export function useSystemHealth() {
  return useScopedQuery(SYSTEM_HEALTH_QUERY_KEY, fetchSystemHealth, {
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: undefined,
  });
}
