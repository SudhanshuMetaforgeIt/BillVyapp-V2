'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import { isApiError, setSessionExpiredHandler } from '@/services/api-client';
import { tokenStorage } from '@/services/token-storage';
import { useAuthStore } from '@/stores/auth.store';

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
 * Reconciles the persisted user with the tokens actually held. A user object
 * without a token means storage was cleared behind our back, so the session is
 * treated as ended.
 */
function useSessionBootstrap(): void {
  const setStatus = useAuthStore((state) => state.setStatus);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    setSessionExpiredHandler(() => clearSession());

    const hasToken = tokenStorage.getAccessToken() !== null;
    const hasUser = useAuthStore.getState().user !== null;

    setStatus(hasToken && hasUser ? 'authenticated' : 'unauthenticated');

    if (!hasToken && hasUser) clearSession();
  }, [setStatus, clearSession]);
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
