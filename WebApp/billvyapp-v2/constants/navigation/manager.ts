import {
  ArrowLeftRight,
  CalendarDays,
  FileText,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  Receipt,
  Scissors,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';

import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';

const base = `/dashboard/${ROLE_SEGMENTS.MANAGER}`;

/**
 * Salon Manager sidebar navigation.
 * Notifications live behind the header bell; Profile and Settings live in the user menu.
 */
export const MANAGER_NAVIGATION: NavSection[] = [
  {
    id: 'main',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: base, icon: LayoutDashboard },
      { id: 'walk-in-billing', label: 'Walk-in Billing', href: `${base}/walk-in-billing`, icon: Receipt },
      { id: 'bills', label: 'Bills', href: `${base}/bills`, icon: FileText },
      { id: 'appointments', label: 'Appointments', href: `${base}/appointments`, icon: CalendarDays },
      { id: 'customers', label: 'Customers', href: `${base}/customers`, icon: Users },
      { id: 'services', label: 'Services', href: `${base}/services`, icon: Scissors },
      { id: 'memberships', label: 'Memberships', href: `${base}/memberships`, icon: Sparkles },
      { id: 'loyalty', label: 'Loyalty', href: `${base}/loyalty`, icon: Gift },
      { id: 'campaigns', label: 'Campaigns', href: `${base}/campaigns`, icon: Megaphone },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    items: [
      { id: 'inventory', label: 'Inventory', href: `${base}/inventory`, icon: Package },
      { id: 'stock-movements', label: 'Stock Movements', href: `${base}/stock-movements`, icon: ArrowLeftRight },
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
