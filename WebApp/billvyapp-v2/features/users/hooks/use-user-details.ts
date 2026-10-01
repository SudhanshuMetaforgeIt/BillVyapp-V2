'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchUserById } from '../services/users.service';
import { USERS_QUERY_KEY } from './use-users';

export function useUserDetails(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, 'detail', userId],
    queryFn: () => fetchUserById(userId!),
    enabled: Boolean(userId) && enabled,
  });
}
