import {
  Building2,
  CreditCard,
  Receipt,
  FileBarChart2,
  Headset,
  History,
  LayoutDashboard,
  Megaphone,
  Search,
  Shield,
  Store,
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
        id: 'salons',
        label: 'Salons',
        href: `${base}/salons`,
        icon: Store,
      },
      { id: 'campaigns', label: 'Campaigns', href: `${base}/campaigns`, icon: Megaphone },
      {
        id: 'payments',
        label: 'Payments',
        href: `${base}/payments`,
        icon: CreditCard,
      },
      { id: 'expenses', label: 'Expenses', href: `${base}/expenses`, icon: Receipt },
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
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'search', label: 'Search', href: `${base}/search`, icon: Search },
      { id: 'audit', label: 'Audit Log', href: `${base}/audit`, icon: History },
    ],
  },
];

export const SUPER_ADMIN_BRAND = {
  roleLabel: 'Super Admin',
  badgeIcon: Shield,
} as const;
