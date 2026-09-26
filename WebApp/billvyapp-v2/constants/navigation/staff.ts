import { CalendarDays, Receipt } from 'lucide-react';

import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';

const base = `/dashboard/${ROLE_SEGMENTS.STAFF}`;

/** Salon staff sidebar — walk-in billing and appointments only. */
export const STAFF_NAVIGATION: NavSection[] = [
  {
    id: 'main',
    items: [
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
    ],
  },
];
