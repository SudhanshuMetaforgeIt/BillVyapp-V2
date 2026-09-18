'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import {
  fetchManagerNotificationsPage,
  fetchNotificationsPage,
  updateNotificationStatus,
} from '../services/notifications.service';
import type {
  ManagerNotificationsListParams,
  ManagerNotificationsPageData,
  NotificationsListParams,
  NotificationsPageData,
} from '../types/notifications.types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'super-admin'] as const;
export const MANAGER_NOTIFICATIONS_QUERY_KEY = [
  'notifications',
  'manager',
] as const;

export function useNotifications(params: NotificationsListParams) {
  return useQuery<NotificationsPageData>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: () => fetchNotificationsPage(params),
    placeholderData: (previous) => previous,
  });
}

export function useManagerNotifications(params: ManagerNotificationsListParams) {
  return useQuery<ManagerNotificationsPageData>({
    queryKey: [...MANAGER_NOTIFICATIONS_QUERY_KEY, params],
    queryFn: () => fetchManagerNotificationsPage(params),
    placeholderData: (previous) => previous,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: number; failed: number }, ApiError, string[]>({
    mutationFn: async (ids) => {
      let ok = 0;
      let failed = 0;
      for (const id of ids) {
        try {
          await updateNotificationStatus(id, 'READ');
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      return { ok, failed };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: MANAGER_NOTIFICATIONS_QUERY_KEY,
      });
      if (result.ok === 0) {
        toast(
          'No notifications could be marked as read. Only delivered messages can move to read.',
        );
        return;
      }
      toast.success(
        result.failed > 0
          ? `Marked ${result.ok} as read (${result.failed} skipped)`
          : `Marked ${result.ok} as read`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
}
