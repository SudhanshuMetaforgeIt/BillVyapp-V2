'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchServicesPage } from '../services/services.service';
import type { ServicesListParams } from '../types/services.types';

export const SERVICES_QUERY_KEY = ['services', 'manager'] as const;

export function useServices(params: ServicesListParams) {
  return useQuery({
    queryKey: [...SERVICES_QUERY_KEY, params],
    queryFn: () => fetchServicesPage(params),
  });
}
