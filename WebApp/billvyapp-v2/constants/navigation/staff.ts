import { CalendarDays, Receipt } from 'lucide-react';
import { ROLE_SEGMENTS } from '@/constants/roles';
import type { NavSection } from './types';
const base = `/dashboard/${ROLE_SEGMENTS.STAFF}`;
export const STAFF_NAVIGATION: NavSection[] = [{ id: 'main', items: [
  { id: 'appointments', label: 'Appointments', href: `${base}/appointments`, icon: CalendarDays },
  { id: 'bills', label: 'Billing', href: `${base}/bills`, icon: Receipt },
] }];
