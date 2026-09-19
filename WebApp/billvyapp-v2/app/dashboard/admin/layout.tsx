import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminShell } from '@/features/dashboard/components/admin-shell';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
