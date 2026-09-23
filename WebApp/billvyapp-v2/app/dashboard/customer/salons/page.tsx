'use client';

import { useCustomerBookingStore } from '@/features/customer-dashboard/stores/customer-booking.store';
import { SalonCard } from '@/features/customer-dashboard/components/salon-card';
import { CategoryBar } from '@/features/customer-dashboard/components/category-bar';
import { MapPin, Search } from 'lucide-react';

export default function SalonsDirectoryPage() {
  const salons = useCustomerBookingStore((s) => s.salons);
  const searchQuery = useCustomerBookingStore((s) => s.searchQuery);
  const setSearchQuery = useCustomerBookingStore((s) => s.setSearchQuery);
  const selectedCategory = useCustomerBookingStore((s) => s.selectedCategory);
  const selectedCity = useCustomerBookingStore((s) => s.selectedCity);

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

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
            Explore Salons & Spas
          </h1>
          <p className="text-xs sm:text-sm text-[#7D766C]">
            Manually browse and choose your favorite salon in {selectedCity}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-[#8C8375]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter salons by name or area..."
            className="w-full rounded-2xl border border-[#EDE5D8] bg-white py-2 pl-9 pr-4 text-xs font-medium text-[#1C1C1E] placeholder:text-[#9E9588] focus:border-[#FFB347] focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <CategoryBar />

      {/* Salons Grid or Empty State */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#7D766C] uppercase tracking-wider">
            Showing {filteredSalons.length} Salons
          </span>
        </div>

        {filteredSalons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredSalons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-12 text-center space-y-2">
            <MapPin className="size-8 text-[#C4A46C] mx-auto opacity-75" />
            <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
              No salons currently available
            </h3>
            <p className="text-xs text-[#7D766C]">
              Salons and branches will appear here automatically as they are added by franchise managers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
