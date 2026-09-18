'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchUsersPage } from '../services/users.service';
import type { UsersListParams, UsersPageData } from '../types/users.types';

export const USERS_QUERY_KEY = ['users', 'super-admin'] as const;

export function useUsers(params: UsersListParams) {
  return useQuery<UsersPageData>({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => fetchUsersPage(params),
    placeholderData: (previous) => previous,
  });
}
