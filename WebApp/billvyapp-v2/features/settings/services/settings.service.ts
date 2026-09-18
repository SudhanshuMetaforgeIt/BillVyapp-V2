import { apiClient } from '@/services/api-client';

import type { SystemHealth } from '../types/settings.types';

/**
 * Platform settings have no backend yet. Only system health is live.
 * A 503 still carries a useful body when the API is degraded.
 */
export async function fetchSystemHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<SystemHealth>('/health', {
    validateStatus: (status) => status === 200 || status === 503,
  });
  return data;
}
