'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Scissors } from 'lucide-react';

import { dashboardHomeFor, ROUTES } from '@/constants/routes';
import { useAuthStatus, useCurrentUser } from '@/hooks/use-current-user';
import { CustomerHeader } from './customer-header';

/**
 * Customer area frame. The role check is a navigation convenience only: every
 * customer API call is scoped server-side to the signed-in customer.
 */
export function CustomerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useCurrentUser();
  const status = useAuthStatus();

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

  const C = ROUTES.dashboard.customer;

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF9] text-[#1C1C1E] antialiased">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>

      <footer className="mt-auto border-t border-[#EFE9DF] bg-[#FAF5ED] py-8 text-xs text-[#7D766C]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF7B00] text-white">
              <Scissors className="size-3.5" />
            </div>
            <span className="font-bold text-[#1C1C1E]">BillVy App</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href={C.salons} className="transition-colors hover:text-[#FF7B00]">
              Salons
            </Link>
            <Link href={C.myBookings} className="transition-colors hover:text-[#FF7B00]">
              My Bookings
            </Link>
            <Link href={C.bills} className="transition-colors hover:text-[#FF7B00]">
              Bills
            </Link>
            <Link href={C.profile} className="transition-colors hover:text-[#FF7B00]">
              Profile
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
