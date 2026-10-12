'use client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchUnreadNotificationCount } from '../services/notification-count.service';

export function useUnreadNotificationCount(enabled = true) {
  const user = useCurrentUser();
  return useScopedQuery(['notifications', 'unread-count'], () => fetchUnreadNotificationCount(user), {
    enabled,
    capability: 'notifications.read',
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: undefined,
  });
}
