'use client';

import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { can, type Capability } from '@/lib/capabilities';
import { scopeKey } from '@/lib/query-scope';
import type { ApiError } from '@/types/api.types';
import { useCurrentUser } from './use-current-user';

type ScopedQueryOptions<T> = Omit<
  UseQueryOptions<T, ApiError, T, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  /** When set, the request is not sent unless the role may call it. */
  capability?: Capability;
};

/**
 * useQuery with the authenticated scope prepended to the key, and disabled
 * until there is a user (and, optionally, the role may call the endpoint).
 * Paginated screens keep showing the previous page while the next loads.
 */
export function useScopedQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
  { capability, enabled = true, ...options }: ScopedQueryOptions<T> = {},
) {
  const user = useCurrentUser();
  const allowed = user !== null && (!capability || can(user, capability));

  return useQuery<T, ApiError, T, QueryKey>({
    queryKey: [...scopeKey(user), ...key],
    queryFn,
    placeholderData: keepPreviousData,
    ...options,
    enabled: allowed && enabled,
  });
}
