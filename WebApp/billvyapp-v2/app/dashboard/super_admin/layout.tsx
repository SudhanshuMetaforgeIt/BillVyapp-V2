import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SuperAdminShell } from '@/features/dashboard/components/super-admin-shell';

export const metadata: Metadata = {
  title: 'Super Admin Dashboard',
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
