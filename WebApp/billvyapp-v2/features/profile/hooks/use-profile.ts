'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api.types';
import { fetchProfile, updateProfile } from '../services/profile.service';
import type { ProfileUser, UpdateProfilePayload } from '../types/profile.types';

export const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

export function useProfile() {
  return useScopedQuery<ProfileUser>(PROFILE_QUERY_KEY, fetchProfile, {
    retry: 1,
    placeholderData: undefined,
  });
}

type UpdateArgs = UpdateProfilePayload & { userId: string };

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const current = useAuthStore((state) => state.user);

  return useMutation<ProfileUser, ApiError, UpdateArgs>({
    mutationFn: ({ userId, ...payload }) => updateProfile(userId, payload),
    onSuccess: (profile) => {
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes('profile'),
      });
      if (current) {
        setUser({
          ...current,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
        });
      }
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(describeApiError(error).message);
    },
  });
}
