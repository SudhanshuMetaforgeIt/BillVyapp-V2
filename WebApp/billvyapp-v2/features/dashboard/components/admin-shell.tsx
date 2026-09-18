'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { ROUTES } from '@/constants/routes';

type AdminShellProps = {
  children: ReactNode;
};

const PAGE_META: Record<string, { title: string; subtitle?: string; hideHeader?: boolean }> = {
  [ROUTES.dashboard.admin.root]: {
    title: 'Dashboard',
    subtitle: 'Overview of your franchise on BillVyApp.',
    // Dashboard has its own in-page header with greeting + controls
    hideHeader: true,
  },
  [ROUTES.dashboard.admin.businesses]: {
    title: 'My Business',
    subtitle: 'Manage your business details and all your franchise branches.',
  },
  [ROUTES.dashboard.admin.services]: {
    title: 'Services',
    subtitle: 'Manage all your services offered across your branches.',
  },
  [ROUTES.dashboard.admin.bills]: {
    title: 'Bills',
    subtitle: 'View and manage bills raised across your franchise.',
  },
  [ROUTES.dashboard.admin.customers]: {
    title: 'Customers',
    subtitle: 'Manage your franchise customer base.',
  },
  [ROUTES.dashboard.admin.staff]: {
    title: 'Staff',
    subtitle: 'Manage staff members across your franchise.',
  },
  [ROUTES.dashboard.admin.campaigns]: {
    title: 'Campaigns',
    subtitle: 'Create and manage marketing campaigns.',
  },
  [ROUTES.dashboard.admin.reports]: {
    title: 'Reports',
    subtitle: 'View insights and generate reports for your franchise.',
  },
  [ROUTES.dashboard.admin.notifications]: {
    title: 'Notifications',
    subtitle: 'View all notifications for your franchise.',
  },
  [ROUTES.dashboard.admin.support]: {
    title: 'Support',
    subtitle: 'Raise and track support tickets.',
  },
  [ROUTES.dashboard.admin.settings]: {
    title: 'Settings',
    subtitle: 'Manage franchise settings and preferences.',
  },
  [ROUTES.dashboard.admin.profile]: {
    title: 'Profile',
    subtitle: 'Manage your profile information and account preferences.',
  },
};

/**
 * Role-specific shell wrapper for Admin (Franchise Admin) routes.
 * Reuses the shared AppShell; only title/notification wiring is role-local.
 * On the root dashboard page the in-page greeting header takes over, so
 * hidePageHeader is set true to avoid a double header.
 */
export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? { title: 'Admin' };

  return (
    <AppShell
      requiredRole="ADMIN"
      title={meta.title}
      subtitle={meta.subtitle}
      hidePageHeader={meta.hideHeader}
    >
      {children}
    </AppShell>
  );
}
