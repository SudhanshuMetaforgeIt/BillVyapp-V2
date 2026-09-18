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
  [ROUTES.dashboard.superAdmin.businesses]: {
    title: 'Businesses',
    subtitle: 'Manage and monitor all businesses on BillVyApp platform.',
  },
  [ROUTES.dashboard.superAdmin.payments]: {
    title: 'Payments',
    subtitle: 'Manage and monitor payments across all businesses.',
  },
  [ROUTES.dashboard.superAdmin.users]: {
    title: 'Users',
    subtitle: 'Manage platform users across all businesses.',
  },
  [ROUTES.dashboard.superAdmin.plans]: {
    title: 'Plans & Pricing',
    subtitle: 'Create and manage subscription plans for businesses.',
  },
  [ROUTES.dashboard.superAdmin.reports]: {
    title: 'Reports',
    subtitle: 'View insights and generate reports across the platform.',
  },
  [ROUTES.dashboard.superAdmin.notifications]: {
    title: 'Notifications',
    subtitle: 'Manage and monitor all system notifications.',
  },
  [ROUTES.dashboard.superAdmin.support]: {
    title: 'Support',
    subtitle: 'Manage support tickets and help users with their queries.',
  },
  [ROUTES.dashboard.superAdmin.settings]: {
    title: 'Settings',
    subtitle: 'Manage system settings and preferences.',
  },
  [ROUTES.dashboard.superAdmin.profile]: {
    title: 'Profile',
    subtitle: 'Manage your profile information and account preferences.',
  },
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
