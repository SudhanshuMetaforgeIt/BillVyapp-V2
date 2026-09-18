import {
  Building2,
  CalendarDays,
  CreditCard,
  FileBarChart2,
  Package,
  Plus,
  Receipt,
  Tags,
  UserPlus,
  Wallet,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { QuickActionConfig } from '../data/placeholders';

export const SUPER_ADMIN_QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'add-business',
    label: 'Add Business',
    href: ROUTES.dashboard.superAdmin.businesses,
    icon: Plus,
  },
  {
    id: 'view-businesses',
    label: 'View Businesses',
    href: ROUTES.dashboard.superAdmin.businesses,
    icon: Building2,
  },
  {
    id: 'manage-plans',
    label: 'Manage Plans',
    href: ROUTES.dashboard.superAdmin.plans,
    icon: Tags,
  },
  {
    id: 'view-payments',
    label: 'View Payments',
    href: ROUTES.dashboard.superAdmin.payments,
    icon: CreditCard,
  },
];

export const MANAGER_QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'new-walk-in',
    label: 'New Walk-in',
    href: ROUTES.dashboard.manager.walkInBilling,
    icon: Receipt,
  },
  {
    id: 'new-appointment',
    label: 'New Appointment',
    href: ROUTES.dashboard.manager.appointments,
    icon: CalendarDays,
  },
  {
    id: 'add-customer',
    label: 'Add Customer',
    href: ROUTES.dashboard.manager.customers,
    icon: UserPlus,
  },
  {
    id: 'collect-payment',
    label: 'Collect Payment',
    href: ROUTES.dashboard.manager.walkInBilling,
    icon: Wallet,
  },
  {
    id: 'check-inventory',
    label: 'Check Inventory',
    href: ROUTES.dashboard.manager.inventory,
    icon: Package,
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    href: ROUTES.dashboard.manager.root,
    icon: FileBarChart2,
  },
];
