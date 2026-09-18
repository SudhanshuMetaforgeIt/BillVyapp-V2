'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api.types';
import { fetchProfile, updateProfile } from '../services/profile.service';
import type { ProfileUser, UpdateProfilePayload } from '../types/profile.types';

export const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery<ProfileUser>({
    queryKey: [...PROFILE_QUERY_KEY, userId],
    queryFn: () => fetchProfile(userId),
    enabled: Boolean(userId),
    retry: 1,
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
      queryClient.setQueryData([...PROFILE_QUERY_KEY, profile.id], profile);
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
      toast.error(error.message);
    },
  });
}
