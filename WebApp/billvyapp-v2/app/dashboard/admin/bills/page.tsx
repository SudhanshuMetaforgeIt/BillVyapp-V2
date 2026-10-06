import { ROUTES } from '@/constants/routes';
import { BillsListView } from '@/features/bills/components/bills-list-view';

export default function AdminBillsPage() {
  return <BillsListView newBillHref={ROUTES.dashboard.admin.walkInBilling} />;
}
