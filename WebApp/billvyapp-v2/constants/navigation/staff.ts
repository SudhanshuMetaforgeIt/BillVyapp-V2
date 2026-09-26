import {
  CalendarDays,
  FileText,
  Gift,
  LayoutDashboard,
  Package,
  Receipt,
  Scissors,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react';

import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';

const base = `/dashboard/${ROLE_SEGMENTS.STAFF}`;

/** Salon staff sidebar. Notifications live behind the header bell; Profile in the user menu. */
export const STAFF_NAVIGATION: NavSection[] = [
  {
    id: 'main',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: base, icon: LayoutDashboard },
      { id: 'walk-in-billing', label: 'Walk-in Billing', href: `${base}/walk-in-billing`, icon: Receipt },
      { id: 'bills', label: 'Bills', href: `${base}/bills`, icon: FileText },
      { id: 'appointments', label: 'Appointments', href: `${base}/appointments`, icon: CalendarDays },
      { id: 'customers', label: 'Customers', href: `${base}/customers`, icon: Users },
      { id: 'services', label: 'Services', href: `${base}/services`, icon: Scissors },
      { id: 'loyalty', label: 'Loyalty', href: `${base}/loyalty`, icon: Gift },
      { id: 'inventory', label: 'Inventory', href: `${base}/inventory`, icon: Package },
      { id: 'purchases', label: 'Purchases', href: `${base}/purchases`, icon: ShoppingCart },
      { id: 'search', label: 'Search', href: `${base}/search`, icon: Search },
    ],
  },
];
