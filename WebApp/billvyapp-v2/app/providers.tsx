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
import { tokenStorage } from '@/services/token-storage';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

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
 * Reconciles the persisted user with the tokens actually held, then confirms
 * the identity with GET /auth/me. The persisted user is only a placeholder so
 * a reload does not flash a blank screen; role, franchiseId and salonId come
 * from the backend.
 *
 * Any identity end (expiry, failed refresh) or scope change also drops the
 * query cache so another tenant's data can never be displayed.
 */
function useSessionBootstrap(): void {
  const queryClient = useQueryClient();
  const setStatus = useAuthStore((state) => state.setStatus);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const resetScope = useUiStore((state) => state.resetScope);

  useEffect(() => {
    const endSession = () => {
      queryClient.clear();
      resetScope();
      clearSession();
    };
    setSessionExpiredHandler(endSession);

    const hasToken = tokenStorage.getAccessToken() !== null;
    const storedUser = useAuthStore.getState().user;

    if (!hasToken) {
      if (storedUser) endSession();
      else setStatus('unauthenticated');
      return;
    }

    if (storedUser) setStatus('authenticated');

    let cancelled = false;
    authService
      .me()
      .then((me) => {
        if (cancelled) return;
        const verified = toSessionUser(me);
        if (!verified) {
          tokenStorage.clear();
          endSession();
          return;
        }
        if (scopeChanged(useAuthStore.getState().user, verified)) {
          queryClient.clear();
          resetScope();
        }
        setUser(verified);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // 401s are already handled by the client (refresh, then endSession).
        // Network/5xx failures keep the stored identity so an offline reload
        // does not sign the user out; the backend still guards every request.
        if (isApiError(error) && error.status === 401) return;
        if (!useAuthStore.getState().user) setStatus('unauthenticated');
      });

    return () => {
      cancelled = true;
    };
  }, [queryClient, setStatus, setUser, clearSession, resetScope]);
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  useSessionBootstrap();
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
