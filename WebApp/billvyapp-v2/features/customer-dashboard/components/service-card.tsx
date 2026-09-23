'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Clock } from 'lucide-react';
import type { ServiceItem } from '../types';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';

interface ServiceCardProps {
  service: ServiceItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const router = useRouter();
  const salons = useCustomerBookingStore((s) => s.salons);
  const setSelectedSalon = useCustomerBookingStore((s) => s.setSelectedSalon);
  const toggleService = useCustomerBookingStore((s) => s.toggleService);

  const handleSelectService = () => {
    const parentSalon = salons.find((s) => s.id === service.salonId) || null;
    if (parentSalon) {
      setSelectedSalon(parentSalon);
    }
    toggleService(service);
    if (parentSalon) {
      router.push(`${ROUTES.dashboard.customer.salons}/${parentSalon.id}`);
    } else {
      router.push(ROUTES.dashboard.customer.booking);
    }
  };

  return (
    <div
      onClick={handleSelectService}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-[#EDE5D8] bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FFB347] hover:shadow-md cursor-pointer"
    >
      {/* Left: Thumbnail & Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        {service.image ? (
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-[#FAF5ED]">
            <img
              src={service.image}
              alt={service.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl bg-[#FFF5E6] text-[#FF7B00] font-bold text-base">
            {service.name[0] || 'S'}
          </div>
        )}

        <div className="min-w-0">
          <h4 className="font-heading text-sm font-bold text-[#1C1C1E] group-hover:text-[#FF7B00] transition-colors truncate">
            {service.name}
          </h4>

          {service.durationMinutes ? (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#7D766C]">
              <Clock className="size-3 text-[#FF7B00]" />
              <span>{service.durationMinutes} mins</span>
            </div>
          ) : null}

          <div className="mt-1 text-xs font-semibold text-[#1C1C1E]">
            <span className="text-[11px] font-normal text-[#8C8375]">From </span>
            <span>₹{service.price}</span>
          </div>
        </div>
      </div>

      {/* Right: Circular Gold Action Button */}
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFB800] text-white shadow-sm shadow-[#FFB800]/30 transition-transform group-hover:scale-110 group-hover:bg-[#FF7B00] active:scale-90"
        aria-label={`Select ${service.name}`}
      >
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
