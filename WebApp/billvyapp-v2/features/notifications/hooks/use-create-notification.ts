'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { invalidatePaths } from '@/lib/query-invalidation';
import { createNotification } from '../services/notifications.service';
import type {
  CreateNotificationPayload,
  NotificationApiItem,
} from '../types/notifications.types';

export function useCreateNotification(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<NotificationApiItem, ApiError, CreateNotificationPayload>({
    mutationFn: createNotification,
    onSuccess: () => {
      toast.success('Notification queued');
      void invalidatePaths(queryClient, [['notifications'], ['dashboard']]);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
