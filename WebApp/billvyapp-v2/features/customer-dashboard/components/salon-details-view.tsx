'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Heart,
  MapPin,
  Phone,
  Plus,
  Scissors,
  ShieldCheck,
  Star,
} from 'lucide-react';

import type { Salon, ServiceCategoryKey, ServiceItem } from '../types';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

interface SalonDetailsViewProps {
  salon: Salon;
  services?: ServiceItem[];
}

const CATEGORY_TABS: { id: ServiceCategoryKey; label: string }[] = [
  { id: 'all', label: 'All Services' },
  { id: 'hair', label: 'Hair' },
  { id: 'beauty', label: 'Skin & Beauty' },
  { id: 'grooming', label: 'Grooming' },
  { id: 'nails', label: 'Nails & Feet' },
  { id: 'spa', label: 'Spa & Massage' },
];

export function SalonDetailsView({ salon, services = [] }: SalonDetailsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ServiceCategoryKey>('all');

  const storeServices = useCustomerBookingStore((s) => s.services);
  const availableServices = services.length > 0 ? services : storeServices.filter((s) => s.salonId === salon.id || !s.salonId);

  const selectedServices = useCustomerBookingStore((s) => s.selectedServices);
  const toggleService = useCustomerBookingStore((s) => s.toggleService);
  const favorites = useCustomerBookingStore((s) => s.favorites);
  const toggleFavorite = useCustomerBookingStore((s) => s.toggleFavorite);

  const isFavorite = favorites.includes(salon.id);

  const filteredServices = availableServices.filter(
    (s) => activeTab === 'all' || s.category === activeTab,
  );

  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  const handleProceedToBooking = () => {
    if (selectedServices.length === 0) return;
    router.push(ROUTES.dashboard.customer.booking);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Back to Browse */}
      <div className="flex items-center justify-between">
        <Link
          href={ROUTES.dashboard.customer.salons}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#665E55] hover:text-[#FF7B00] transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Salons</span>
        </Link>
      </div>

      {/* Salon Header Hero Card */}
      <div className="overflow-hidden rounded-3xl border border-[#EDE5D8] bg-white shadow-sm">
        <div className="relative h-56 sm:h-72 lg:h-80 w-full overflow-hidden bg-[#FBF8F3]">
          {salon.image ? (
            <img
              src={salon.image}
              alt={salon.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFF5E6] to-[#FFE8C2]">
              <Scissors className="size-16 text-[#FF7B00]/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(salon.id)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-[#7D766C] shadow-md hover:scale-105 active:scale-95 transition-transform"
              aria-label="Save to favorites"
            >
              <Heart
                className={cn(
                  'size-5 transition-colors',
                  isFavorite ? 'fill-[#FF3B30] text-[#FF3B30]' : 'text-[#665E55]',
                )}
              />
            </button>
          </div>

          {/* Bottom Banner Info */}
          <div className="absolute bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-6 text-white">
            {salon.tags && salon.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {salon.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-xs font-semibold text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
              {salon.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/90">
              {salon.rating ? (
                <div className="flex items-center gap-1.5 font-bold">
                  <Star className="size-4 fill-[#FFB800] text-[#FFB800]" />
                  <span>{salon.rating.toFixed(1)}</span>
                  {salon.reviewCount ? (
                    <span className="font-normal text-white/75">({salon.reviewCount} reviews)</span>
                  ) : null}
                </div>
              ) : null}
              {salon.area && salon.city ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-[#FFB347]" />
                  <span>{salon.area}, {salon.city}</span>
                </div>
              ) : null}
              {salon.openingHours ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-[#FFB347]" />
                  <span>{salon.openingHours}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Quick Details Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#F0EAE1] bg-[#FFFDF9] p-4 text-xs sm:text-sm">
          <div className="flex items-center gap-3 py-2 sm:px-4">
            <MapPin className="size-4.5 text-[#FF7B00] shrink-0" />
            <span className="text-[#4A453E]">{salon.fullAddress || `${salon.area || ''}, ${salon.city || ''}` || 'Address available upon request'}</span>
          </div>
          <div className="flex items-center gap-3 py-2 sm:px-4">
            <Phone className="size-4.5 text-[#FF7B00] shrink-0" />
            <span className="text-[#4A453E]">{salon.phone || 'Contact branch via reception'}</span>
          </div>
          <div className="flex items-center gap-3 py-2 sm:px-4">
            <ShieldCheck className="size-4.5 text-emerald-600 shrink-0" />
            <span className="text-[#4A453E]">Verified Salon Partner</span>
          </div>
        </div>
      </div>

      {/* Main Content: Services List + Selected Services Cart */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Cols: Service Selection Menu */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-[#1C1C1E]">
              Select Services
            </h2>
            <span className="text-xs text-[#7D766C]">
              {filteredServices.length} options available
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all active:scale-95',
                  activeTab === tab.id
                    ? 'bg-[#FF7B00] text-white shadow-sm shadow-[#FF7B00]/25'
                    : 'border border-[#EFE8DC] bg-white text-[#524B40] hover:bg-[#FAF5ED]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Services List Grid or Empty State */}
          {filteredServices.length > 0 ? (
            <div className="space-y-3">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);

                return (
                  <div
                    key={service.id}
                    className={cn(
                      'group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all duration-200',
                      isSelected
                        ? 'border-[#FF7B00] bg-[#FFFBF5] shadow-xs'
                        : 'border-[#EDE5D8] bg-white hover:border-[#FFD099] shadow-2xs',
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.name}
                          className="size-16 sm:size-20 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-xl bg-[#FFF5E6] text-[#FF7B00] font-bold text-lg">
                          {service.name[0] || 'S'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-base font-bold text-[#1C1C1E]">
                            {service.name}
                          </h4>
                          {service.popular && (
                            <span className="rounded-md bg-[#FFE9CC] px-2 py-0.5 text-[10px] font-bold text-[#FF7B00]">
                              Popular
                            </span>
                          )}
                        </div>

                        {service.description && (
                          <p className="mt-1 text-xs text-[#736C62] line-clamp-2 max-w-md">
                            {service.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
                          {service.durationMinutes ? (
                            <span className="flex items-center gap-1 text-[#7D766C]">
                              <Clock className="size-3.5 text-[#FF7B00]" />
                              {service.durationMinutes} mins
                            </span>
                          ) : null}
                          <span className="text-[#1C1C1E] font-bold text-sm">
                            ₹{service.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Add / Selected Button */}
                    <button
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 self-end sm:self-center rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95',
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border border-[#FFB347] bg-[#FFF8EE] text-[#FF7B00] hover:bg-[#FF7B00] hover:text-white',
                      )}
                    >
                      {isSelected ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5" />
                          <span>Add Service</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-10 text-center space-y-2">
              <Scissors className="size-8 text-[#C4A46C] mx-auto opacity-75 mb-1" />
              <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
                No services configured for this salon
              </h3>
              <p className="text-xs text-[#7D766C] max-w-sm mx-auto">
                Services added by this branch manager will automatically appear here.
              </p>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Booking Cart Summary */}
        <div className="lg:col-span-4 sticky top-24">
          <div className="rounded-3xl border border-[#EDE5D8] bg-white p-5 sm:p-6 shadow-sm">
            <h3 className="font-heading text-base font-bold text-[#1C1C1E] border-b border-[#F0EAE1] pb-3">
              Booking Summary
            </h3>

            {selectedServices.length > 0 ? (
              <div className="mt-4 space-y-4">
                {/* Selected List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedServices.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-[#1C1C1E] truncate">{item.name}</p>
                        <p className="text-[#8C8375]">{item.durationMinutes} mins</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-[#1C1C1E]">₹{item.price}</span>
                        <button
                          type="button"
                          onClick={() => toggleService(item)}
                          className="text-[11px] font-semibold text-[#B42318] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-[#F0EAE1] pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-[#665E55]">
                    <span>Total Duration</span>
                    <span className="font-bold text-[#1C1C1E]">{totalDuration} mins</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-[#1C1C1E] pt-1">
                    <span>Estimated Total</span>
                    <span className="text-[#FF7B00]">₹{totalAmount}</span>
                  </div>
                </div>

                {/* Continue CTA */}
                <button
                  type="button"
                  onClick={handleProceedToBooking}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7B00] to-[#E66F00] py-3 text-sm font-bold text-white shadow-md shadow-[#FF7B00]/30 hover:opacity-95 transition-transform active:scale-[0.98]"
                >
                  <span>Select Date & Time</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Scissors className="size-8 text-[#D6CAB8] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#665D50]">
                  No services selected yet.
                </p>
                <p className="mt-1 text-[11px] text-[#9E9588]">
                  Add one or more services to proceed to appointment scheduling.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
