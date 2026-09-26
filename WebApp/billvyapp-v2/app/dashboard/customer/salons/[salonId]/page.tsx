'use client';

import { use } from 'react';
import Link from 'next/link';
import { useCustomerBookingStore } from '@/features/customer-dashboard/stores/customer-booking.store';
import { SalonDetailsView } from '@/features/customer-dashboard/components/salon-details-view';
import { Scissors, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

interface SalonPageProps {
  params: Promise<{ salonId: string }>;
}

export default function SalonDetailPage({ params }: SalonPageProps) {
  const { salonId } = use(params);
  const salons = useCustomerBookingStore((s) => s.salons);
  const selectedSalon = useCustomerBookingStore((s) => s.selectedSalon);

  const salon = salons.find((s) => s.id === salonId) || (selectedSalon?.id === salonId ? selectedSalon : null);

  if (!salon) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-[#EDE5D8] bg-[#FAF7F2] p-10 text-center space-y-4 my-8">
        <Scissors className="size-10 text-[#C4A46C] mx-auto opacity-75" />
        <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">
          Salon Not Found
        </h2>
        <p className="text-xs text-[#7D766C]">
          The requested salon or branch details are not available.
        </p>
        <div>
          <Link
            href={ROUTES.dashboard.customer.salons}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7B00] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E66F00] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Browse Salons</span>
          </Link>
        </div>
      </div>
    );
  }

  return <SalonDetailsView salon={salon} />;
}
