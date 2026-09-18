'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useManagerDashboard } from '@/features/dashboard/hooks/use-manager-dashboard';
import { ROUTES } from '@/constants/routes';

type ManagerShellProps = {
  children: ReactNode;
};

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Role-specific shell wrapper for Manager routes.
 * Reuses the shared AppShell; only title/notification wiring is role-local.
 */
export function ManagerShell({ children }: ManagerShellProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { data } = useManagerDashboard();

  const pageMeta: Record<string, { title: string; subtitle?: string }> = {
    [ROUTES.dashboard.manager.root]: {
      title: user
        ? `${greetingFor(new Date().getHours())}, ${user.firstName}`
        : 'Dashboard',
      subtitle: "Here's what's happening at your salon today.",
    },
    [ROUTES.dashboard.manager.walkInBilling]: {
      title: 'Create New Bill',
      subtitle: 'Walk-in billing for your salon.',
    },
    [ROUTES.dashboard.manager.appointments]: {
      title: 'Appointments',
      subtitle: 'View and manage salon appointments.',
    },
    [ROUTES.dashboard.manager.customers]: {
      title: 'Customers',
      subtitle: 'Manage your salon customers.',
    },
    [ROUTES.dashboard.manager.inventory]: {
      title: 'Inventory',
      subtitle: 'Track products and stock levels.',
    },
    [ROUTES.dashboard.manager.memberships]: {
      title: 'Memberships',
      subtitle: 'Manage membership plans and members.',
    },
    [ROUTES.dashboard.manager.services]: {
      title: 'Services',
      subtitle: 'Manage salon services and pricing.',
    },
    [ROUTES.dashboard.manager.campaigns]: {
      title: 'Campaigns',
      subtitle: 'Create and track marketing campaigns.',
    },
    [ROUTES.dashboard.manager.notifications]: {
      title: 'Notifications',
      subtitle: 'Stay updated with important alerts and activities.',
    },
    [ROUTES.dashboard.manager.settings]: {
      title: 'Settings',
      subtitle: 'Manage your business preferences and configurations.',
    },
    [ROUTES.dashboard.manager.profile]: {
      title: 'Profile',
      subtitle: 'Manage your profile information and account preferences.',
    },
  };

  const meta = pageMeta[pathname] ?? { title: 'Salon Manager' };

  return (
    <AppShell
      requiredRole="MANAGER"
      title={meta.title}
      subtitle={meta.subtitle}
      notificationCount={data?.unreadNotifications ?? 0}
    >
      {children}
    </AppShell>
  );
}
