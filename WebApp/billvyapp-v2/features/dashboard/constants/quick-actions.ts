import {
  Building2,
  CreditCard,
  Plus,
  Tags,
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
