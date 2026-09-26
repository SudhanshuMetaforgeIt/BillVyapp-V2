'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ServiceCard } from './service-card';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';

export function PopularServicesSection() {
  const services = useCustomerBookingStore((s) => s.services);
  const popularServices = services.filter((s) => s.popular).slice(0, 4);
  const displayServices = popularServices.length > 0 ? popularServices : services.slice(0, 4);

  return (
    <section className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E]">
            Popular Services
          </h2>
          <p className="text-xs sm:text-sm text-[#7D766C]">
            Featured salon, hair, and wellness treatments
          </p>
        </div>

        <Link
          href={ROUTES.dashboard.customer.services}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FF7B00] hover:text-[#E66F00] transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Grid or Empty State */}
      {displayServices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {displayServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-10 text-center space-y-2">
          <Sparkles className="size-8 text-[#C4A46C] mx-auto opacity-75 mb-1" />
          <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
            No services currently available
          </h3>
          <p className="text-xs text-[#7D766C] max-w-sm mx-auto">
            Available salon services and treatments will appear here automatically.
          </p>
        </div>
      )}
    </section>
  );
}
