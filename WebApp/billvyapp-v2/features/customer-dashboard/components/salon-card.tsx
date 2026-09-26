'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Heart, MapPin, Star } from 'lucide-react';
import type { Salon } from '../types';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

interface SalonCardProps {
  salon: Salon;
  onSelect?: (salon: Salon) => void;
}

export function SalonCard({ salon, onSelect }: SalonCardProps) {
  const router = useRouter();
  const favorites = useCustomerBookingStore((s) => s.favorites);
  const toggleFavorite = useCustomerBookingStore((s) => s.toggleFavorite);
  const setSelectedSalon = useCustomerBookingStore((s) => s.setSelectedSalon);

  const isFavorite = favorites.includes(salon.id);

  const handleCardClick = () => {
    setSelectedSalon(salon);
    if (onSelect) {
      onSelect(salon);
    } else {
      router.push(`${ROUTES.dashboard.customer.salons}/${salon.id}`);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#EDE5D8] bg-white shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#FFB347] hover:shadow-lg">
      {/* Salon Image Banner */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#FAF5ED]">
        <img
          src={salon.image}
          alt={salon.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-60" />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(salon.id);
          }}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-[#7D766C] shadow-sm hover:scale-110 active:scale-95 transition-all"
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart
            className={cn(
              'size-4 transition-colors',
              isFavorite
                ? 'fill-[#FF3B30] text-[#FF3B30]'
                : 'text-[#665E55] hover:text-[#FF3B30]',
            )}
          />
        </button>
      </div>

      {/* Salon Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-base font-bold text-[#1C1C1E] group-hover:text-[#FF7B00] transition-colors">
            {salon.name}
          </h3>
        </div>

        {/* Rating */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#524B40]">
          <Star className="size-3.5 fill-[#FFB800] text-[#FFB800]" />
          <span className="font-bold text-[#1C1C1E]">{salon.rating.toFixed(1)}</span>
          <span className="text-[#8C8375]">({salon.reviewCount})</span>
        </div>

        {/* Address / Area (Strictly without distance/GPS per requirement) */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#6B6458]">
          <MapPin className="size-3.5 text-[#FF7B00] shrink-0" />
          <span className="truncate">{salon.area}, {salon.city}</span>
        </div>

        {/* Category Badges */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {salon.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-[#FAF5ED] border border-[#EFE8DC] px-2 py-0.5 text-[11px] font-medium text-[#7D7364]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Spacer */}
        <div className="mt-4 pt-3 border-t border-[#F5EFE6] flex items-center justify-between">
          <span className="text-xs font-medium text-[#7D7364]">
            {salon.openingHours}
          </span>

          {/* View Details Action Button */}
          <button
            type="button"
            onClick={handleCardClick}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FFD099] bg-white px-3 py-1.5 text-xs font-bold text-[#FF7B00] hover:bg-[#FFF7ED] hover:border-[#FF7B00] transition-colors active:scale-95"
          >
            <span>View Details</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
