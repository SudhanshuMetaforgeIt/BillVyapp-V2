import { redirect } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export default function AdminPurchasesPage() {
  redirect(`${ROUTES.dashboard.admin.expenses}?tab=purchases`);
}
