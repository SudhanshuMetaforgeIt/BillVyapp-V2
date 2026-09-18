import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ManagerShell } from '@/features/dashboard/components/manager-shell';

export const metadata: Metadata = {
  title: 'Manager Dashboard',
};

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <ManagerShell>{children}</ManagerShell>;
}
