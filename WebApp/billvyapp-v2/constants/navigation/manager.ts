import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Package,
  Receipt,
  Scissors,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';

const base = `/dashboard/${ROLE_SEGMENTS.MANAGER}`;

/**
 * Salon Manager sidebar navigation.
 * Profile remains in the user menu.
 */
export const MANAGER_NAVIGATION: NavSection[] = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: base,
        icon: LayoutDashboard,
      },
      {
        id: 'walk-in-billing',
        label: 'Walk-in Billing',
        href: `${base}/walk-in-billing`,
        icon: Receipt,
      },
      {
        id: 'appointments',
        label: 'Appointments',
        href: `${base}/appointments`,
        icon: CalendarDays,
      },
      {
        id: 'customers',
        label: 'Customers',
        href: `${base}/customers`,
        icon: Users,
      },
      {
        id: 'inventory',
        label: 'Inventory',
        href: `${base}/inventory`,
        icon: Package,
      },
      {
        id: 'memberships',
        label: 'Memberships',
        href: `${base}/memberships`,
        icon: Sparkles,
      },
      {
        id: 'services',
        label: 'Services',
        href: `${base}/services`,
        icon: Scissors,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: `${base}/notifications`,
        icon: Bell,
      },
      {
        id: 'settings',
        label: 'Settings',
        href: `${base}/settings`,
        icon: Settings,
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        href: `${base}/campaigns`,
        icon: Megaphone,
      },
    ],
  },
];
