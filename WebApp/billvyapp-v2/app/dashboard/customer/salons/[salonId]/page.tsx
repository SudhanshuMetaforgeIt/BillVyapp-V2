import { SalonDetailsView } from '@/features/customer-dashboard/components/salon-details-view';

export default async function CustomerSalonPage({
  params,
}: {
  params: Promise<{ salonId: string }>;
}) {
  const { salonId } = await params;
  return <SalonDetailsView salonId={salonId} />;
}
