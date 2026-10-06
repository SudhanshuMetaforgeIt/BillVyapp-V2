import { ROUTES } from '@/constants/routes';
import { BillsListView } from '@/features/bills/components/bills-list-view';

export default function ManagerBillsPage() {
  return <BillsListView newBillHref={ROUTES.dashboard.manager.walkInBilling} />;
}
