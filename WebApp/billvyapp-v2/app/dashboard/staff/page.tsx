import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

/** Staff has no dashboard — land on walk-in billing. */
export default function StaffDashboardPage() {
  redirect(ROUTES.dashboard.staff.walkInBilling);
}
