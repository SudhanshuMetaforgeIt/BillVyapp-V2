import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { StaffShell } from '@/features/dashboard/components/manager-shell';

export const metadata: Metadata = {
  title: 'Staff Dashboard',
};

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
