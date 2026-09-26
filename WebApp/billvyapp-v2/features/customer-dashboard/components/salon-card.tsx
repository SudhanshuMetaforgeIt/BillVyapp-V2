'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Phone } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { Salon } from '@/types/models';

export function salonAddress(salon: Pick<Salon, 'addressLine1' | 'addressLine2' | 'city' | 'state'>) {
  return [salon.addressLine1, salon.addressLine2, salon.city, salon.state].filter(Boolean).join(', ');
}

export function SalonCard({ salon }: { salon: Salon }) {
  const initials = salon.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={ROUTES.dashboard.customer.salon(salon.id)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#EDE5D8] bg-white shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#FFB347] hover:shadow-lg"
    >
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#FFF3E5] via-[#FFE5CC] to-[#FFD099]">
        <span className="font-heading text-3xl font-extrabold tracking-tight text-[#FF7B00]/80">{initials}</span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-heading text-base font-bold text-[#1C1C1E] transition-colors group-hover:text-[#FF7B00]">
          {salon.name}
        </h3>

        <div className="mt-2 flex items-start gap-1.5 text-xs text-[#6B6458]">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#FF7B00]" />
          <span className="line-clamp-2">{salonAddress(salon)}</span>
        </div>

        {salon.phone ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#6B6458]">
            <Phone className="size-3.5 shrink-0 text-[#FF7B00]" />
            <span>{salon.phone}</span>
          </div>
        ) : null}

        <div className="mt-auto flex justify-end border-t border-[#F5EFE6] pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#FFD099] bg-white px-3 py-1.5 text-xs font-bold text-[#FF7B00] transition-colors group-hover:border-[#FF7B00] group-hover:bg-[#FFF7ED]">
            View services
            <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
