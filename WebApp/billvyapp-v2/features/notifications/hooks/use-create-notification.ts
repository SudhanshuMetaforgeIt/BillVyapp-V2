'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { SUPER_ADMIN_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-super-admin-dashboard';
import { createNotification } from '../services/notifications.service';
import type {
  CreateNotificationPayload,
  NotificationApiItem,
} from '../types/notifications.types';
import { NOTIFICATIONS_QUERY_KEY } from './use-notifications';

export function useCreateNotification(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<NotificationApiItem, ApiError, CreateNotificationPayload>({
    mutationFn: createNotification,
    onSuccess: () => {
      toast.success('Notification queued');
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_DASHBOARD_QUERY_KEY,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
