import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CustomerShell } from '@/features/customer-dashboard';

export const metadata: Metadata = {
  title: 'Customer Dashboard | BillVy App',
  description: 'Book salon appointments, explore beauty services, and manage your bookings on BillVy App.',
};

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
