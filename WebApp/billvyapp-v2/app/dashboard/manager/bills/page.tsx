import { ROUTES } from '@/constants/routes';
import { BillsListView } from '@/features/bills';

export default function ManagerBillsPage() {
  return <BillsListView newBillHref={ROUTES.dashboard.manager.walkInBilling} />;
}
