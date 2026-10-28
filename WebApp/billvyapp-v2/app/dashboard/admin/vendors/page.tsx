import { redirect } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export default function AdminVendorsPage() {
  redirect(`${ROUTES.dashboard.admin.expenses}?tab=vendors`);
}
