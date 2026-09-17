'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { useSuperAdminDashboard } from '@/features/dashboard/hooks/use-super-admin-dashboard';
import { ROUTES } from '@/constants/routes';

type SuperAdminShellProps = {
  children: ReactNode;
};

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  [ROUTES.dashboard.superAdmin.root]: {
    title: 'Dashboard',
    subtitle: 'Overview of your BillVyApp platform.',
  },
  [ROUTES.dashboard.superAdmin.businesses]: { title: 'Businesses' },
  [ROUTES.dashboard.superAdmin.payments]: { title: 'Payments' },
  [ROUTES.dashboard.superAdmin.users]: { title: 'Users' },
  [ROUTES.dashboard.superAdmin.plans]: { title: 'Plans & Pricing' },
  [ROUTES.dashboard.superAdmin.reports]: { title: 'Reports' },
  [ROUTES.dashboard.superAdmin.notifications]: { title: 'Notifications' },
  [ROUTES.dashboard.superAdmin.support]: { title: 'Support' },
  [ROUTES.dashboard.superAdmin.settings]: { title: 'Settings' },
  [ROUTES.dashboard.superAdmin.profile]: { title: 'Profile' },
};

/**
 * Role-specific shell wrapper for Super Admin routes.
 * Reuses the shared AppShell; only title/notification wiring is role-local.
 */
export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const pathname = usePathname();
  const { data } = useSuperAdminDashboard();
  const meta = PAGE_META[pathname] ?? { title: 'Super Admin' };

  return (
    <AppShell
      requiredRole="SUPER_ADMIN"
      title={meta.title}
      subtitle={meta.subtitle}
      notificationCount={data?.unreadNotifications ?? 0}
    >
      {children}
    </AppShell>
  );
}
