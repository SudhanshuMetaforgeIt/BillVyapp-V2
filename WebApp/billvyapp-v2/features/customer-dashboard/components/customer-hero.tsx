'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Copy, MapPin, Search, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { ROUTES } from '@/constants/routes';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { cn } from '@/lib/utils';

export function CustomerHero() {
  const router = useRouter();
  const searchQuery = useCustomerBookingStore((s) => s.searchQuery);
  const setSearchQuery = useCustomerBookingStore((s) => s.setSearchQuery);
  const selectedCity = useCustomerBookingStore((s) => s.selectedCity);
  const applyPromoCode = useCustomerBookingStore((s) => s.applyPromoCode);

  const [copied, setCopied] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText('WELCOME20');
    setCopied(true);
    applyPromoCode('WELCOME20');
    toast.success('Promo code WELCOME20 applied! (20% OFF)');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(ROUTES.dashboard.customer.salons);
    }
  };

  return (
    <section className="relative overflow-hidden pt-2 pb-6">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
        {/* Left Side: Headline & Search */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#F0E6D8] bg-[#FDF8F0] px-3.5 py-1 text-xs font-semibold text-[#8C6D37] shadow-2xs">
            <span>Look Good</span>
            <span className="size-1 rounded-full bg-[#8C6D37]/50" />
            <span>Feel Great</span>
          </div>

          {/* Heading */}
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#1C1C1E] leading-[1.15]">
            Find your perfect <br />
            <span className="text-[#FF7B00]">salon experience</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-2.5 text-sm sm:text-base text-[#6B655B] max-w-xl">
            Discover top salons, services & products in your area.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 rounded-2xl border border-[#EBE3D7] bg-white p-2.5 shadow-sm transition-all focus-within:border-[#FFB347] focus-within:shadow-md max-w-2xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex flex-1 items-center gap-3 px-3 py-1">
                <Search className="size-5 text-[#8C8375] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search salons, services or products..."
                  className="w-full bg-transparent text-sm font-medium text-[#1C1C1E] placeholder:text-[#9E9588] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7B00] to-[#F59E0B] px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#FF7B00]/25 hover:from-[#E66F00] hover:to-[#D97706] transition-all active:scale-[0.98]"
              >
                Search
              </button>
            </div>

            {/* City subtitle indicator */}
            <div className="mt-2 flex items-center gap-1 px-3 pt-1 border-t border-[#F5EFE6] text-xs font-medium text-[#7D766C]">
              <MapPin className="size-3.5 text-[#FF7B00]" />
              <span>{selectedCity}</span>
            </div>
          </form>
        </div>

        {/* Right Side: Promo Offer Banner */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-3xl border border-[#EFE4D2] bg-gradient-to-br from-[#FFF8EE] via-[#FFF3DF] to-[#FFE8C2] p-6 sm:p-7 shadow-sm">
            {/* Background aesthetic circles */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 h-44 w-44 rounded-full bg-[#FFB347]/15 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-36 w-36 rounded-full bg-[#FF7B00]/10 blur-xl pointer-events-none" />

            <div className="relative z-10 grid sm:grid-cols-12 gap-4 items-center">
              {/* Promo Text */}
              <div className="sm:col-span-7 space-y-3">
                <div className="inline-block">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#1C1C1E] block">
                    Get <span className="text-[#FF7B00]">20% OFF</span>
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#665D50]">
                    on your first booking
                  </span>
                </div>

                {/* Coupon Code Pill */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7D7364]">Use Code:</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFD099] bg-white px-2.5 py-1 text-xs font-bold text-[#FF7B00] shadow-2xs hover:bg-[#FFF9F2] transition-colors"
                    title="Click to copy & apply code"
                  >
                    <span>WELCOME20</span>
                    {copied ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3 opacity-70" />
                    )}
                  </button>
                </div>

                {/* CTA Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.dashboard.customer.salons)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7B00] to-[#E66F00] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#FF7B00]/30 hover:opacity-95 transition-transform active:scale-95"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Promo Image & Tag */}
              <div className="sm:col-span-5 relative flex flex-col items-center justify-center">
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                  {/* Beauty Products Image */}
                  <img
                    src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80"
                    alt="Beauty & Spa Products"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 inset-x-1.5 text-center">
                    <span className="text-[9px] font-bold text-white tracking-tight drop-shadow-sm">
                      Self care looks good on you!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="mt-4 flex justify-center gap-1.5">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    activeSlide === idx
                      ? 'w-4 bg-[#FF7B00]'
                      : 'w-1.5 bg-[#D6CBBA] hover:bg-[#B8AA94]',
                  )}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
