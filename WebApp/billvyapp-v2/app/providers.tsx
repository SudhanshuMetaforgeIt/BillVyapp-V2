'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

import { isApiError, setSessionExpiredHandler, setSessionRefreshedHandler } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { scopeChanged, toSessionUser } from '@/services/session';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { setBusinessTimezone } from '@/lib/business-timezone';
import type { AuthSession } from '@/types/user.types';
import { PerformanceBaseline } from '@/components/dev/performance-baseline';

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
 * Access tokens are memory-only, so a protected full reload uses the refresh
 * cookie. The refresh response includes the verified user and scope.
 */
function useSessionBootstrap(): void {
  const pathname = usePathname();
  const queryClient = useQueryClient();
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
    const installSession = (session: AuthSession): boolean => {
      const verified = toSessionUser(session.user);
      if (!verified) return false;
      if (scopeChanged(useAuthStore.getState().user, verified)) {
        queryClient.clear();
        resetScope();
      }
      setAccessToken(session.accessToken);
      setUser(verified);
      setBusinessTimezone(verified.timezone);
      return true;
    };
    setSessionExpiredHandler(endSession);
    setSessionRefreshedHandler(installSession);

    // Drop tokens left over from the previous localStorage-based auth.
    try {
      window.localStorage.removeItem('billvy.access-token');
      window.localStorage.removeItem('billvy.refresh-token');
    } catch {
      // ignore
    }

    let cancelled = false;

    const bootstrap = async () => {
      const initial = useAuthStore.getState();
      if (pathname === '/' || pathname.startsWith('/auth/')) {
        return;
      }

      if (initial.accessToken && initial.status === 'authenticated') return;

      try {
        const session = await authService.refresh();
        if (cancelled || useAuthStore.getState().accessToken !== initial.accessToken) return;
        if (!installSession(session)) {
          endSession();
        }
      } catch {
        if (cancelled) return;
        if (useAuthStore.getState().accessToken === initial.accessToken) endSession();
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    queryClient,
    setUser,
    setAccessToken,
    clearSession,
    resetScope,
    pathname,
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
      <PerformanceBaseline><SessionBootstrap>{children}</SessionBootstrap></PerformanceBaseline>
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
