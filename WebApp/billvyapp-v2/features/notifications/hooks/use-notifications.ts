'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import {
  fetchManagerNotificationsPage,
  fetchNotificationsPage,
  updateNotificationStatus,
} from '../services/notifications.service';
import type {
  ManagerNotificationsListParams,
  NotificationsListParams,
} from '../types/notifications.types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'super-admin'] as const;
export const MANAGER_NOTIFICATIONS_QUERY_KEY = [
  'notifications',
  'manager',
] as const;

export function useNotifications(params: NotificationsListParams) {
  return useScopedQuery(
    [...NOTIFICATIONS_QUERY_KEY, params],
    () => fetchNotificationsPage(params),
    { capability: 'notifications.read' },
  );
}

export function useManagerNotifications(params: ManagerNotificationsListParams) {
  return useScopedQuery(
    [...MANAGER_NOTIFICATIONS_QUERY_KEY, params],
    () => fetchManagerNotificationsPage(params),
    { capability: 'notifications.read' },
  );
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
      void invalidateAfter(queryClient, 'notifications');
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
