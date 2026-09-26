'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import type { AuthSession } from '@/types/user.types';

/**
 * Installs a freshly issued session.
 *
 * The query cache is cleared first: a previous user's franchise, salon or
 * customer data must never render under the new identity, even for a frame.
 */
export function useEstablishSession() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const resetScope = useUiStore((state) => state.resetScope);

  return useCallback(
    (session: AuthSession) => {
      queryClient.clear();
      resetScope();
      setSession(session);
    },
    [queryClient, resetScope, setSession],
  );
}
