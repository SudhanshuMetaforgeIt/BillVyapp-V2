'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchServicesPage } from '../services/services.service';
import type { ServicesListParams } from '../types/services.types';

export const SERVICES_QUERY_KEY = ['services', 'manager'] as const;

export function useServices(params: ServicesListParams) {
  return useScopedQuery([...SERVICES_QUERY_KEY, params], () => fetchServicesPage(params), {
    capability: 'catalog.read',
  });
}
