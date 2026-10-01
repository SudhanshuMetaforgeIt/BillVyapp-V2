'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import { isApiError, setSessionExpiredHandler } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { scopeChanged, toSessionUser } from '@/services/session';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { setBusinessTimezone } from '@/lib/business-timezone';

/**
 * Application-wide providers.
 *
 * This is the ONLY place a Toaster is mounted and the only place a QueryClient
 * is created. Mounting either again elsewhere causes duplicate toasts or a
 * second, empty cache.
 */

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // 4xx responses are the caller's fault - retrying just delays the
          // error. Only retry genuine server/network failures.
          if (isApiError(error) && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Reconciles the persisted user with the live session.
 *
 * Access tokens are memory-only, so a full reload starts without one. We try
 * cookie-based refresh first; then confirm identity with GET /auth/me.
 */
function useSessionBootstrap(): void {
  const queryClient = useQueryClient();
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const resetScope = useUiStore((state) => state.resetScope);

  useEffect(() => {
    const endSession = () => {
      queryClient.clear();
      resetScope();
      clearSession();
    };
    setSessionExpiredHandler(endSession);

    // Drop tokens left over from the previous localStorage-based auth.
    try {
      window.localStorage.removeItem('billvy.access-token');
      window.localStorage.removeItem('billvy.refresh-token');
    } catch {
      // ignore
    }

    let cancelled = false;

    const bootstrap = async () => {
      const storedUser = useAuthStore.getState().user;
      let accessToken = useAuthStore.getState().accessToken;

      if (!accessToken) {
        try {
          const tokens = await authService.refresh();
          if (cancelled) return;
          accessToken = tokens.accessToken;
          setAccessToken(accessToken);
        } catch {
          if (cancelled) return;
          endSession();
          return;
        }
      }

      if (storedUser) setStatus('authenticated');

      try {
        const me = await authService.me();
        if (cancelled) return;
        const verified = toSessionUser(me);
        if (!verified) {
          endSession();
          return;
        }
        if (scopeChanged(useAuthStore.getState().user, verified)) {
          queryClient.clear();
          resetScope();
        }
        setUser(verified);
        setBusinessTimezone(verified.timezone);
      } catch (error: unknown) {
        if (cancelled) return;
        // 401s are already handled by the client (refresh, then endSession).
        if (isApiError(error) && error.status === 401) return;
        if (!useAuthStore.getState().user) setStatus('unauthenticated');
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    queryClient,
    setStatus,
    setUser,
    setAccessToken,
    clearSession,
    resetScope,
  ]);
}

function useBusinessTimezoneSync(): void {
  const timezone = useAuthStore((state) => state.user?.timezone);
  useEffect(() => {
    setBusinessTimezone(timezone);
  }, [timezone]);
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  useSessionBootstrap();
  useBusinessTimezoneSync();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so React 19 Strict Mode double-invocation does not throw
  // away a populated cache on every render.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap>{children}</SessionBootstrap>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'text-sm',
        }}
      />
    </QueryClientProvider>
  );
}
