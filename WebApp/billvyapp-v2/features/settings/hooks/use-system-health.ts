'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchSystemHealth } from '../services/settings.service';
import type { SystemHealth } from '../types/settings.types';

export const SYSTEM_HEALTH_QUERY_KEY = ['settings', 'system-health'] as const;

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: SYSTEM_HEALTH_QUERY_KEY,
    queryFn: fetchSystemHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
