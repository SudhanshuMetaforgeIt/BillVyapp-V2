import { Award, Bell, Calendar, Home, Receipt, Scissors, User } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { NavSection } from './types';

const C = ROUTES.dashboard.customer;

export const CUSTOMER_NAVIGATION: NavSection[] = [
  {
    id: 'customer-main',
    items: [
      { id: 'customer-home', label: 'Home', href: C.root, icon: Home },
      { id: 'customer-salons', label: 'Salons', href: C.salons, icon: Scissors },
      { id: 'customer-my-bookings', label: 'My Bookings', href: C.myBookings, icon: Calendar },
      { id: 'customer-bills', label: 'Bills', href: C.bills, icon: Receipt },
      { id: 'customer-rewards', label: 'Rewards', href: C.rewards, icon: Award },
      { id: 'customer-notifications', label: 'Notifications', href: C.notifications, icon: Bell },
      { id: 'customer-profile', label: 'Profile', href: C.profile, icon: User },
    ],
  },
];
