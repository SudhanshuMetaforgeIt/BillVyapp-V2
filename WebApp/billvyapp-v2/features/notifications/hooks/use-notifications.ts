'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchNotificationsPage } from '../services/notifications.service';
import type {
  NotificationsListParams,
  NotificationsPageData,
} from '../types/notifications.types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'super-admin'] as const;

export function useNotifications(params: NotificationsListParams) {
  return useQuery<NotificationsPageData>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: () => fetchNotificationsPage(params),
    placeholderData: (previous) => previous,
  });
}
