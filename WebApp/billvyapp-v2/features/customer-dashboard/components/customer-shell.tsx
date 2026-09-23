'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CustomerHeader } from './customer-header';
import { ROUTES } from '@/constants/routes';
import { Heart, Scissors, Sparkles } from 'lucide-react';

interface CustomerShellProps {
  children: ReactNode;
}

export function CustomerShell({ children }: CustomerShellProps) {
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#1C1C1E] flex flex-col antialiased">
      {/* Top Header */}
      <CustomerHeader />

      {/* Main Page Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#EFE9DF] bg-[#FAF5ED] py-8 text-xs text-[#7D766C]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF7B00] text-white">
              <Scissors className="size-3.5" />
            </div>
            <span className="font-bold text-[#1C1C1E]">BillVy App</span>
            <span>— The Modern Salon Booking Experience</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href={ROUTES.dashboard.customer.root}
              className="hover:text-[#FF7B00] transition-colors"
            >
              Home
            </Link>
            <Link
              href={ROUTES.dashboard.customer.salons}
              className="hover:text-[#FF7B00] transition-colors"
            >
              Salons
            </Link>
            <Link
              href={ROUTES.dashboard.customer.services}
              className="hover:text-[#FF7B00] transition-colors"
            >
              Services
            </Link>
            <Link
              href={ROUTES.dashboard.customer.myBookings}
              className="hover:text-[#FF7B00] transition-colors"
            >
              My Bookings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
