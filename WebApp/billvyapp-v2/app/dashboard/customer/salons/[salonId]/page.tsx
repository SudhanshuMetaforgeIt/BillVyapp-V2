'use client';

import { use } from 'react';

import { SalonDetailsView } from '@/features/customer-dashboard';

export default function CustomerSalonPage({ params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = use(params);
  return <SalonDetailsView salonId={salonId} />;
}
