import {
  BarChart2,
  Bell,
  BookUser,
  Building2,
  CreditCard,
  Headset,
  Gift,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Scissors,
  Search,
  ShoppingCart,
  Store,
  Truck,
  Users2,
} from 'lucide-react';

import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';

const base = `/dashboard/${ROLE_SEGMENTS.ADMIN}`;

/**
 * Admin (Franchise Admin) sidebar navigation.
 * Notifications live behind the header bell; Profile and Settings live in the top-right user menu.
 */
export const ADMIN_NAVIGATION: NavSection[] = [
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
        label: 'My Businesses',
        href: `${base}/businesses`,
        icon: Building2,
      },
      {
        id: 'salons',
        label: 'Salons',
        href: `${base}/salons`,
        icon: Store,
      },
      {
        id: 'services',
        label: 'Services',
        href: `${base}/services`,
        icon: Scissors,
      },
      {
        id: 'bills',
        label: 'Bills',
        href: `${base}/bills`,
        icon: Receipt,
      },
      {
        id: 'payments',
        label: 'Payments',
        href: `${base}/payments`,
        icon: CreditCard,
      },
      {
        id: 'customers',
        label: 'Customers',
        href: `${base}/customers`,
        icon: BookUser,
      },
      {
        id: 'staff',
        label: 'Staff',
        href: `${base}/staff`,
        icon: Users2,
      },
      {
        id: 'loyalty',
        label: 'Loyalty',
        href: `${base}/loyalty`,
        icon: Gift,
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        href: `${base}/campaigns`,
        icon: Megaphone,
      },
      {
        id: 'reports',
        label: 'Reports',
        href: `${base}/reports`,
        icon: BarChart2,
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
    id: 'procurement',
    label: 'Procurement',
    items: [
      { id: 'purchases', label: 'Purchases', href: `${base}/purchases`, icon: ShoppingCart },
      { id: 'vendors', label: 'Vendors', href: `${base}/vendors`, icon: Truck },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'search', label: 'Search', href: `${base}/search`, icon: Search },
    ],
  },
];

export const ADMIN_BRAND = {
  roleLabel: 'Admin Panel',
  badgeIcon: Bell,
} as const;
