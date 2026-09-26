'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchAdminMyBusinessData } from '../services/admin-my-business.service';

export const ADMIN_MY_BUSINESS_QUERY_KEY = ['admin', 'my-business', 'salons', 'bills', 'payments'] as const;

export function useAdminMyBusiness() {
  const user = useCurrentUser();

  return useScopedQuery(
    ADMIN_MY_BUSINESS_QUERY_KEY,
    () => fetchAdminMyBusinessData(user?.franchiseId),
    { placeholderData: undefined },
  );
}
