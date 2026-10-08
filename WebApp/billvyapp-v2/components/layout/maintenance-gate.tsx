'use client';

import type { ReactNode } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { api } from '@/services/api-client';

type MaintenanceStatus = { enabled: boolean; message: string };

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const affected =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'STAFF';
  const { logout, isPending } = useLogout();
  const query = useScopedQuery(
    ['settings', 'maintenance-status'],
    () => api.get<MaintenanceStatus>('/settings/maintenance-status'),
    {
      enabled: affected,
      staleTime: 0,
      refetchInterval: 5_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: 'always',
      retry: 1,
      placeholderData: undefined,
    },
  );

  if (!affected) return children;
  if (query.data && !query.data.enabled) return children;
  const maintenance = query.data?.enabled === true;
  return (
    <main className="flex min-h-svh items-center justify-center bg-ivory px-6 text-text">
      <section
        role={maintenance ? 'alert' : 'status'}
        aria-live="polite"
        className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 text-center shadow-sm"
      >
        <Wrench className="mx-auto mb-5 size-12 text-champagne" aria-hidden />
        <h1 className="text-2xl font-semibold">
          {maintenance
            ? 'Application under maintenance'
            : query.isError
              ? 'Unable to check application availability'
              : 'Checking application availability…'}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          {maintenance
            ? query.data?.message
            : query.isError
              ? 'Please try again. Your session is still signed in.'
              : 'Please wait a moment.'}
        </p>
        {maintenance && (
          <p className="mt-3 text-xs text-text-secondary">
            This page will reopen automatically when maintenance is complete.
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Check again
          </Button>
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={() => void logout()}
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
