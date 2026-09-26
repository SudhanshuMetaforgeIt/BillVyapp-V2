'use client';

import { useState } from 'react';
import { ServiceCard } from '@/features/customer-dashboard/components/service-card';
import { CategoryBar } from '@/features/customer-dashboard/components/category-bar';
import { useCustomerBookingStore } from '@/features/customer-dashboard/stores/customer-booking.store';
import { Search, Sparkles } from 'lucide-react';

export default function ServicesCatalogPage() {
  const services = useCustomerBookingStore((s) => s.services);
  const selectedCategory = useCustomerBookingStore((s) => s.selectedCategory);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = services.filter((svc) => {
    const matchesCategory =
      selectedCategory === 'all' || svc.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (svc.description && svc.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
            Services & Treatments
          </h1>
          <p className="text-xs sm:text-sm text-[#7D766C]">
            Explore individual services and book them at top partner salons
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-[#8C8375]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hair, facial, spa..."
            className="w-full rounded-2xl border border-[#EDE5D8] bg-white py-2 pl-9 pr-4 text-xs font-medium text-[#1C1C1E] placeholder:text-[#9E9588] focus:border-[#FFB347] focus:outline-none"
          />
        </div>
      </div>

      {/* Category selector */}
      <CategoryBar />

      {/* Services Grid or Empty State */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-[#7D766C] uppercase tracking-wider">
          Available Services ({filteredServices.length})
        </span>

        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-12 text-center space-y-2">
            <Sparkles className="size-8 text-[#C4A46C] mx-auto opacity-75 mb-1" />
            <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
              No services currently available
            </h3>
            <p className="text-xs text-[#7D766C] max-w-sm mx-auto">
              Services added by salons will automatically appear here for customer booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
