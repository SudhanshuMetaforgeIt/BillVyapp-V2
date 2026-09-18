'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { SUPER_ADMIN_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-super-admin-dashboard';
import { updateUserStatus } from '../services/users.service';
import type { UserApiItem } from '../types/users.types';
import { USERS_QUERY_KEY } from './use-users';

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    UserApiItem,
    ApiError,
    { id: string; isActive: boolean; name: string }
  >({
    mutationFn: ({ id, isActive }) => updateUserStatus(id, isActive),
    onSuccess: (user, variables) => {
      toast.success(
        variables.isActive
          ? `${variables.name} activated`
          : `${variables.name} deactivated`,
      );
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: SUPER_ADMIN_DASHBOARD_QUERY_KEY,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
