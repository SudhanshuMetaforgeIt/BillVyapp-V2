import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CustomerFooter } from '@/features/customer-dashboard/components/customer-footer';
import { CustomerShell } from '@/features/customer-dashboard/components/customer-shell';

export const metadata: Metadata = {
  title: 'Customer Dashboard | BillVy App',
  description: 'Book salon appointments, explore beauty services, and manage your bookings on BillVy App.',
};

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF9] text-[#1C1C1E] antialiased">
      <CustomerShell>{children}</CustomerShell>
      <CustomerFooter />
    </div>
  );
}
