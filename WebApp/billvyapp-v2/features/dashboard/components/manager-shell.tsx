'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ROUTES } from '@/constants/routes';
import { SubscriptionGate } from '@/features/subscription/components/subscription-gate';

type SalonShellProps = {
  children: ReactNode;
};

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type PageMeta = Record<string, { title: string; subtitle?: string }>;

function sharedMeta(r: {
  walkInBilling: string;
  bills: string;
  appointments: string;
  customers: string;
  inventory: string;
  purchases: string;
  loyalty: string;
  services: string;
  notifications: string;
  support: string;
  search: string;
  profile: string;
}): PageMeta {
  return {
    [r.walkInBilling]: { title: 'Create New Bill', subtitle: 'Walk-in billing for your salon.' },
    [r.bills]: { title: 'Bills', subtitle: 'Bills, payments and attached documents.' },
    [r.appointments]: { title: 'Appointments', subtitle: 'View and manage salon appointments.' },
    [r.customers]: { title: 'Customers', subtitle: 'Manage your salon customers.' },
    [r.inventory]: { title: 'Inventory', subtitle: 'Track products and stock levels.' },
    [r.purchases]: { title: 'Purchases', subtitle: 'Purchase orders from vendors.' },
    [r.loyalty]: { title: 'Loyalty', subtitle: 'Customer loyalty points and adjustments.' },
    [r.services]: { title: 'Services', subtitle: 'Salon services and pricing.' },
    [r.notifications]: { title: 'Notifications', subtitle: 'Messages sent to customers.' },
    [r.support]: { title: 'Support', subtitle: 'Raise and track support tickets.' },
    [r.search]: { title: 'Search', subtitle: 'Find customers, bills, appointments and more.' },
    [r.profile]: { title: 'Profile', subtitle: 'Your account information.' },
  };
}

function useRootMeta(root: string, subtitle: string): PageMeta {
  const user = useCurrentUser();
  return {
    [root]: {
      title: user ? `${greetingFor(new Date().getHours())}, ${user.firstName}` : 'Dashboard',
      subtitle,
    },
  };
}

/** Shell for Manager routes. */
export function ManagerShell({ children }: SalonShellProps) {
  const pathname = usePathname();
  const r = ROUTES.dashboard.manager;
  const pageMeta: PageMeta = {
    [r.expenses]: { title: 'Expenses', subtitle: 'Record and track your branch expenses.' },
    ...useRootMeta(r.root, "Here's what's happening at your salon today."),
    ...sharedMeta(r),
    [r.salonPhotos]: { title: 'Salon Photos', subtitle: 'Manage your salon cover and gallery.' },
    [r.stockMovements]: { title: 'Stock Movements', subtitle: 'Every stock change, with its reason.' },
    [r.vendors]: { title: 'Vendors', subtitle: 'Suppliers for your products.' },
    [r.memberships]: { title: 'Memberships', subtitle: 'Manage membership plans and members.' },
    [r.campaigns]: { title: 'Campaigns', subtitle: 'Create and track marketing campaigns.' },
    [r.subscriptionRequired]: {
      title: 'Subscription required',
      subtitle: 'Your franchise must be enrolled to use BillVyApp.',
    },
  };
  const meta = pageMeta[pathname] ?? { title: 'Salon Manager' };

  return (
    <AppShell requiredRole="MANAGER" title={meta.title} subtitle={meta.subtitle}>
      <SubscriptionGate>{children}</SubscriptionGate>
    </AppShell>
  );
}

/** Shell for Staff routes — walk-in billing and appointments only. */
export function StaffShell({ children }: SalonShellProps) {
  const pathname = usePathname();
  const r = ROUTES.dashboard.staff;
  const pageMeta: PageMeta = {
    [r.walkInBilling]: {
      title: 'Create New Bill',
      subtitle: 'Walk-in billing for your salon.',
    },
    [r.appointments]: {
      title: 'Appointments',
      subtitle: 'View and manage salon appointments.',
    },
    [r.notifications]: {
      title: 'Notifications',
      subtitle: 'Messages for your salon.',
    },
    [r.profile]: {
      title: 'Profile',
      subtitle: 'Your account information.',
    },
    [r.subscriptionRequired]: {
      title: 'Subscription required',
      subtitle: 'Your franchise must be enrolled to use BillVyApp.',
    },
  };
  const meta = pageMeta[pathname] ?? { title: 'Salon Staff' };

  return (
    <AppShell requiredRole="STAFF" title={meta.title} subtitle={meta.subtitle}>
      <SubscriptionGate>{children}</SubscriptionGate>
    </AppShell>
  );
}
