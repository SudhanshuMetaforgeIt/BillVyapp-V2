'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { SUPER_ADMIN_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-super-admin-dashboard';
import { createUser } from '../services/users.service';
import type { CreateUserPayload, UserApiItem } from '../types/users.types';
import { USERS_QUERY_KEY } from './use-users';

export function useCreateUser(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<UserApiItem, ApiError, CreateUserPayload>({
    mutationFn: createUser,
    onSuccess: (user) => {
      toast.success(`${user.firstName} ${user.lastName} created`);
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
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
