import { ROUTES } from '@/constants/routes';
import { BillsListView } from '@/features/bills';

export default function AdminBillsPage() {
  return <BillsListView newBillHref={ROUTES.dashboard.admin.walkInBilling} />;
}
