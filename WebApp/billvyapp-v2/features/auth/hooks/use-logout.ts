'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

import { ROUTES } from '@/constants/routes';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

/**
 * Ends the session and clears every trace of the previous user.
 *
 * The cache must be cleared: leaving another user's customers or bills in
 * memory would leak them into the next session on a shared device.
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  const resetScope = useUiStore((state) => state.resetScope);
  const [isPending, setIsPending] = useState(false);

  const logout = useCallback(async () => {
    setIsPending(true);
    try {
      await authService.logout();
    } catch {
      // The local session is torn down regardless; a failed revoke server-side
      // must not strand the user in a signed-in UI.
    } finally {
      clearSession();
      resetScope();
      queryClient.clear();
      setIsPending(false);
      toast.success('Signed out');
      router.replace(ROUTES.auth.login);
    }
  }, [clearSession, resetScope, queryClient, router]);

  return { logout, isPending };
}
