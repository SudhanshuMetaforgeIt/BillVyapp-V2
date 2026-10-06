'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { dashboardHomeFor, ROUTES } from '@/constants/routes';
import { useAuthStatus, useCurrentUser } from '@/hooks/use-current-user';
import { useLikelyNextPagesPrefetch } from '@/hooks/use-likely-next-pages-prefetch';
import { CustomerHeader } from './customer-header';

/**
 * Customer area frame. The role check is a navigation convenience only: every
 * customer API call is scoped server-side to the signed-in customer.
 */
export function CustomerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useCurrentUser();
  const status = useAuthStatus();
  useLikelyNextPagesPrefetch();

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated' || !user) {
      router.replace(ROUTES.auth.login);
      return;
    }
    if (user.role !== 'CUSTOMER') router.replace(dashboardHomeFor(user.role));
  }, [status, user, router]);

  if (status === 'loading' || !user || user.role !== 'CUSTOMER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF9]">
        <Loader2 className="size-8 animate-spin text-[#FF7B00]" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <CustomerHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </>
  );
}
