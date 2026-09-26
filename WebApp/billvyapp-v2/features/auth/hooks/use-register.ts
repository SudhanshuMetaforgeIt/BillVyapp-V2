'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { dashboardHomeFor } from '@/constants/routes';
import { authService, type RegisterPayload } from '@/services/auth.service';
import type { ApiError } from '@/types/api.types';
import type { AuthSession } from '@/types/user.types';
import { useEstablishSession } from './use-establish-session';

/**
 * Public customer registration.
 *
 * On success the backend returns a session with role CUSTOMER. Redirect uses
 * that role — never a client-selected destination for privileged dashboards.
 */
export function useRegister() {
  const router = useRouter();
  const establishSession = useEstablishSession();

  return useMutation<AuthSession, ApiError, RegisterPayload>({
    mutationFn: (payload) => authService.register(payload),
    onSuccess: (session) => {
      if (session.user.role !== 'CUSTOMER') {
        toast.error('Registration completed with an unexpected account type.');
        return;
      }

      establishSession(session);
      toast.success(`Welcome, ${session.user.firstName}`);
      router.replace(dashboardHomeFor(session.user.role));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
