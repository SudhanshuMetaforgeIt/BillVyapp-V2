'use client';

import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/hooks/use-current-user';
import { fetchAdminMyBusinessData } from '../services/admin-my-business.service';
import type { AdminMyBusinessData } from '../types/admin-my-business.types';

export const ADMIN_MY_BUSINESS_QUERY_KEY = ['admin', 'my-business'] as const;

export function useAdminMyBusiness() {
  const user = useCurrentUser();
  const franchiseId = user?.franchiseId;

  return useQuery<AdminMyBusinessData>({
    queryKey: [...ADMIN_MY_BUSINESS_QUERY_KEY, franchiseId],
    queryFn: () => fetchAdminMyBusinessData(franchiseId),
  });
}
