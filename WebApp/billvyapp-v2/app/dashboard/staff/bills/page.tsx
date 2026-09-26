import { ROUTES } from '@/constants/routes';
import { BillsListView } from '@/features/bills';

export default function StaffBillsPage() {
  return <BillsListView newBillHref={ROUTES.dashboard.staff.walkInBilling} />;
}
