'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { scopeKey } from '@/lib/query-scope';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api.types';
import { profilePhotoService, type ProfilePhoto } from '../services/profile-photo.service';

export function useProfilePhoto() {
  const client = useQueryClient();
  const query = useScopedQuery(['profile-photo', 'me'], profilePhotoService.get, { placeholderData: undefined });
  const mutation = useMutation<ProfilePhoto & { ownerId: string | undefined }, ApiError, File | null>({
    mutationFn: async (file) => {
      const ownerId = useAuthStore.getState().user?.id;
      const result = await (file ? profilePhotoService.upload(file) : profilePhotoService.remove());
      return { ...result, ownerId };
    },
    onSuccess: (result) => {
      const current = useAuthStore.getState().user;
      if (!current || current.id !== result.ownerId) return;
      useAuthStore.getState().setUser({ ...current, profilePhoto: result.profilePhoto });
      client.setQueryData([...scopeKey(current), 'profile-photo', 'me'], { profilePhoto: result.profilePhoto });
      void client.invalidateQueries({ predicate: (q) =>
        q.queryKey.some((key) => typeof key === 'string' && ['profile', 'profile-photo', 'auth', 'customers', 'customer-portal', 'users'].includes(key)),
      });
      toast.success(result.profilePhoto ? 'Profile photo updated' : 'Profile photo removed');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });
  return { ...query, mutation };
}
