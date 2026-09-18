'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { dashboardHomeFor } from '@/constants/routes';
import { authService, type RegisterPayload } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types/api.types';
import type { AuthSession } from '@/types/user.types';

/**
 * Public customer registration.
 *
 * On success the backend returns a session with role CUSTOMER. Redirect uses
 * that role — never a client-selected destination for privileged dashboards.
 */
export function useRegister() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation<AuthSession, ApiError, RegisterPayload>({
    mutationFn: (payload) => authService.register(payload),
    onSuccess: (session) => {
      if (session.user.role !== 'CUSTOMER') {
        toast.error('Registration completed with an unexpected account type.');
        return;
      }

      setSession(session);
      toast.success(`Welcome, ${session.user.firstName}`);
      router.replace(dashboardHomeFor(session.user.role));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
