import { Calendar, Home, Scissors, Sparkles } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { NavSection } from './types';

export const CUSTOMER_NAVIGATION: NavSection[] = [
  {
    id: 'customer-main',
    items: [
      {
        id: 'customer-home',
        label: 'Home',
        href: ROUTES.dashboard.customer.root,
        icon: Home,
      },
      {
        id: 'customer-salons',
        label: 'Salons',
        href: ROUTES.dashboard.customer.salons,
        icon: Scissors,
      },
      {
        id: 'customer-services',
        label: 'Services',
        href: ROUTES.dashboard.customer.services,
        icon: Sparkles,
      },
      {
        id: 'customer-my-bookings',
        label: 'My Bookings',
        href: ROUTES.dashboard.customer.myBookings,
        icon: Calendar,
      },
    ],
  },
];
