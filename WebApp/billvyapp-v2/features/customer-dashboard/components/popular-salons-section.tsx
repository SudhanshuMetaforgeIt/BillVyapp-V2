'use client';

import Link from 'next/link';
import { ArrowRight, Scissors } from 'lucide-react';
import { SalonCard } from './salon-card';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';

export function PopularSalonsSection() {
  const salons = useCustomerBookingStore((s) => s.salons);
  const searchQuery = useCustomerBookingStore((s) => s.searchQuery);
  const selectedCategory = useCustomerBookingStore((s) => s.selectedCategory);

  const filteredSalons = salons.filter((salon) => {
    const matchesSearch =
      !searchQuery ||
      salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salon.area.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      salon.categories?.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const displaySalons = filteredSalons.slice(0, 4);

  return (
    <section className="py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E]">
            Popular Salons
          </h2>
          <p className="text-xs sm:text-sm text-[#7D766C]">
            Explore top rated salons and branches in your area
          </p>
        </div>

        <Link
          href={ROUTES.dashboard.customer.salons}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FF7B00] hover:text-[#E66F00] transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Grid or Empty State */}
      {displaySalons.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {displaySalons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-10 text-center space-y-2">
          <Scissors className="size-8 text-[#C4A46C] mx-auto opacity-75 mb-1" />
          <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
            No salons currently available
          </h3>
          <p className="text-xs text-[#7D766C] max-w-sm mx-auto">
            Salons and branches will appear here automatically as they are added by franchise managers.
          </p>
        </div>
      )}
    </section>
  );
}
