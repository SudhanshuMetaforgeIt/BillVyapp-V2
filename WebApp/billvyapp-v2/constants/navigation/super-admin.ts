import {
  Building2,
  CreditCard,
  FileBarChart2,
  Headset,
  LayoutDashboard,
  Shield,
  Tags,
  Users,
} from 'lucide-react';

import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';

const base = `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}`;

/**
 * Super Admin sidebar navigation.
 * Notifications live behind the header bell; Profile and Settings live in the user menu.
 */
export const SUPER_ADMIN_NAVIGATION: NavSection[] = [
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
        id: 'businesses',
        label: 'Businesses',
        href: `${base}/businesses`,
        icon: Building2,
      },
      {
        id: 'payments',
        label: 'Payments',
        href: `${base}/payments`,
        icon: CreditCard,
      },
      {
        id: 'users',
        label: 'Users',
        href: `${base}/users`,
        icon: Users,
      },
      {
        id: 'plans',
        label: 'Plans & Pricing',
        href: `${base}/plans`,
        icon: Tags,
      },
      {
        id: 'reports',
        label: 'Reports',
        href: `${base}/reports`,
        icon: FileBarChart2,
      },
      {
        id: 'support',
        label: 'Support',
        href: `${base}/support`,
        icon: Headset,
      },
    ],
  },
];

export const SUPER_ADMIN_BRAND = {
  roleLabel: 'Super Admin',
  badgeIcon: Shield,
} as const;
