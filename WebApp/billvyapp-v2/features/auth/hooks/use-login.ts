'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { dashboardHomeFor } from '@/constants/routes';
import { authService, type LoginPayload } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api.types';
import type { AuthSession } from '@/types/user.types';

/**
 * Email + password sign-in for staff and admin roles.
 *
 * The destination is derived from the role the backend returns, never from
 * anything the form supplied.
 */
export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation<AuthSession, ApiError, LoginPayload>({
    mutationFn: (payload) => authService.login(payload),
    onSuccess: (session) => {
      setSession(session);
      toast.success(`Welcome back, ${session.user.firstName}`);
      router.replace(dashboardHomeFor(session.user.role));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
