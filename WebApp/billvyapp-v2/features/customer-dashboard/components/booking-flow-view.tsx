'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  MapPin,
  Scissors,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { STANDARD_TIME_SLOTS } from '../data/constants';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

export function BookingFlowView() {
  const router = useRouter();
  const user = useCurrentUser();

  const selectedSalon = useCustomerBookingStore((s) => s.selectedSalon);
  const selectedServices = useCustomerBookingStore((s) => s.selectedServices);
  const selectedDate = useCustomerBookingStore((s) => s.selectedDate);
  const setSelectedDate = useCustomerBookingStore((s) => s.setSelectedDate);
  const selectedTimeSlot = useCustomerBookingStore((s) => s.selectedTimeSlot);
  const setSelectedTimeSlot = useCustomerBookingStore((s) => s.setSelectedTimeSlot);
  const promoCode = useCustomerBookingStore((s) => s.promoCode);
  const discountPercentage = useCustomerBookingStore((s) => s.discountPercentage);
  const applyPromoCode = useCustomerBookingStore((s) => s.applyPromoCode);
  const removePromoCode = useCustomerBookingStore((s) => s.removePromoCode);
  const customerNotes = useCustomerBookingStore((s) => s.customerNotes);
  const setCustomerNotes = useCustomerBookingStore((s) => s.setCustomerNotes);
  const confirmBooking = useCustomerBookingStore((s) => s.confirmBooking);

  const [inputCoupon, setInputCoupon] = useState(promoCode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate 14 upcoming selectable days
  const today = new Date();
  const upcomingDays = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const discount = Math.round((subtotal * discountPercentage) / 100);
  const totalAmount = Math.max(0, subtotal - discount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const success = applyPromoCode(inputCoupon);
    if (success) {
      toast.success(`Coupon ${inputCoupon.toUpperCase()} applied!`);
    } else {
      toast.error('Invalid coupon code. Try WELCOME20');
    }
  };

  const handleConfirm = () => {
    if (!selectedSalon) {
      toast.error('Please select a salon first.');
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service.');
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select an appointment date and time.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const booked = confirmBooking({
        name: user ? `${user.firstName} ${user.lastName || ''}` : 'Customer',
        phone: '',
      });
      setIsSubmitting(false);
      if (booked) {
        toast.success('Appointment booked successfully!');
        router.push(ROUTES.dashboard.customer.confirmation);
      }
    }, 600);
  };

  if (!selectedSalon || selectedServices.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-[#EDE5D8] bg-white p-8 text-center space-y-4 my-8">
        <Scissors className="size-10 text-[#FF7B00] mx-auto opacity-75" />
        <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">
          No Services Selected
        </h2>
        <p className="text-xs text-[#7D766C]">
          Please browse salons and choose the services you would like to book.
        </p>
        <Link
          href={ROUTES.dashboard.customer.salons}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF7B00] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E66F00] transition-colors"
        >
          <span>Browse Salons</span>
        </Link>
      </div>
    );
  }

  const morningSlots = STANDARD_TIME_SLOTS.filter((s) => s.period === 'morning');
  const afternoonSlots = STANDARD_TIME_SLOTS.filter((s) => s.period === 'afternoon');
  const eveningSlots = STANDARD_TIME_SLOTS.filter((s) => s.period === 'evening');

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Back button */}
      <div>
        <Link
          href={`${ROUTES.dashboard.customer.salons}/${selectedSalon.id}`}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#665E55] hover:text-[#FF7B00] transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Salon Services</span>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left 7 Cols: Date & Time Slot Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Select Date */}
          <div className="rounded-3xl border border-[#EDE5D8] bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#F0EAE1]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF2E0] text-xs font-bold text-[#FF7B00]">
                1
              </div>
              <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
                Select Appointment Date
              </h3>
            </div>

            {/* Date Pill Strip */}
            <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {upcomingDays.map((day) => {
                const dayString = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDate === dayString;

                return (
                  <button
                    key={dayString}
                    type="button"
                    onClick={() => setSelectedDate(dayString)}
                    className={cn(
                      'flex flex-col items-center justify-center min-w-[4.2rem] rounded-2xl border p-3 text-center transition-all duration-150 active:scale-95',
                      isSelected
                        ? 'border-[#FF7B00] bg-[#FF7B00] text-white shadow-sm shadow-[#FF7B00]/30'
                        : 'border-[#EDE5D8] bg-[#FFFDF9] text-[#524B40] hover:border-[#FFD099] hover:bg-white',
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-85">
                      {format(day, 'EEE')}
                    </span>
                    <span className="text-lg font-black my-0.5">
                      {format(day, 'dd')}
                    </span>
                    <span className="text-[10px] font-medium opacity-85">
                      {format(day, 'MMM')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Time Slot */}
          <div className="rounded-3xl border border-[#EDE5D8] bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#F0EAE1]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF2E0] text-xs font-bold text-[#FF7B00]">
                2
              </div>
              <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
                Select Time Slot
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              {/* Morning */}
              <div>
                <p className="text-xs font-semibold text-[#8C8375] uppercase tracking-wider mb-2">
                  Morning Slots
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {morningSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTimeSlot(slot.time)}
                      className={cn(
                        'rounded-xl border py-2 px-3 text-xs font-semibold transition-all',
                        !slot.available
                          ? 'border-[#EFEAE1] bg-[#F7F4EF] text-[#A89F91] cursor-not-allowed opacity-50'
                          : selectedTimeSlot === slot.time
                            ? 'border-[#FF7B00] bg-[#FF7B00] text-white shadow-2xs'
                            : 'border-[#EDE5D8] bg-white text-[#4A453E] hover:border-[#FFB347] hover:bg-[#FFFBF5]',
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Afternoon */}
              <div>
                <p className="text-xs font-semibold text-[#8C8375] uppercase tracking-wider mb-2">
                  Afternoon Slots
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {afternoonSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTimeSlot(slot.time)}
                      className={cn(
                        'rounded-xl border py-2 px-3 text-xs font-semibold transition-all',
                        !slot.available
                          ? 'border-[#EFEAE1] bg-[#F7F4EF] text-[#A89F91] cursor-not-allowed opacity-50'
                          : selectedTimeSlot === slot.time
                            ? 'border-[#FF7B00] bg-[#FF7B00] text-white shadow-2xs'
                            : 'border-[#EDE5D8] bg-white text-[#4A453E] hover:border-[#FFB347] hover:bg-[#FFFBF5]',
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evening */}
              <div>
                <p className="text-xs font-semibold text-[#8C8375] uppercase tracking-wider mb-2">
                  Evening Slots
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {eveningSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTimeSlot(slot.time)}
                      className={cn(
                        'rounded-xl border py-2 px-3 text-xs font-semibold transition-all',
                        !slot.available
                          ? 'border-[#EFEAE1] bg-[#F7F4EF] text-[#A89F91] cursor-not-allowed opacity-50'
                          : selectedTimeSlot === slot.time
                            ? 'border-[#FF7B00] bg-[#FF7B00] text-white shadow-2xs'
                            : 'border-[#EDE5D8] bg-white text-[#4A453E] hover:border-[#FFB347] hover:bg-[#FFFBF5]',
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="rounded-3xl border border-[#EDE5D8] bg-white p-5 shadow-sm">
            <label
              htmlFor="notes"
              className="block text-xs font-bold text-[#1C1C1E] uppercase tracking-wider mb-1.5"
            >
              Special Instructions / Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g., preference for senior stylist..."
              className="w-full rounded-xl border border-[#EDE5D8] bg-[#FFFDF9] p-3 text-xs text-[#1C1C1E] placeholder:text-[#9E9588] focus:border-[#FFB347] focus:outline-none"
            />
          </div>
        </div>

        {/* Right 5 Cols: Review Booking Summary */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="rounded-3xl border border-[#EDE5D8] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-bold text-[#1C1C1E] border-b border-[#F0EAE1] pb-3">
              Review Booking
            </h3>

            {/* Salon Info */}
            <div className="rounded-2xl bg-[#FFF9F0] border border-[#F5E8D3] p-3.5 flex items-start gap-3">
              {selectedSalon.image ? (
                <img
                  src={selectedSalon.image}
                  alt={selectedSalon.name}
                  className="size-14 rounded-xl object-cover"
                />
              ) : (
                <div className="size-14 rounded-xl bg-[#FFE8C2] flex items-center justify-center font-bold text-[#FF7B00]">
                  {selectedSalon.name[0] || 'S'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-heading text-sm font-bold text-[#1C1C1E] truncate">
                  {selectedSalon.name}
                </h4>
                {selectedSalon.area ? (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-[#7D766C]">
                    <MapPin className="size-3 text-[#FF7B00]" />
                    <span className="truncate">{selectedSalon.area}, {selectedSalon.city}</span>
                  </div>
                ) : null}
                <div className="mt-1 flex items-center gap-2 text-xs font-medium text-[#524B40]">
                  <Calendar className="size-3 text-[#FF7B00]" />
                  <span>{selectedDate}</span>
                  <span>•</span>
                  <Clock className="size-3 text-[#FF7B00]" />
                  <span>{selectedTimeSlot}</span>
                </div>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#665E55] uppercase tracking-wider">
                Services ({selectedServices.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex justify-between items-center text-xs py-1 border-b border-[#F8F4EE] last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-[#1C1C1E]">{svc.name}</p>
                      {svc.durationMinutes ? (
                        <p className="text-[11px] text-[#8C8375]">{svc.durationMinutes} mins</p>
                      ) : null}
                    </div>
                    <span className="font-bold text-[#1C1C1E]">₹{svc.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} className="pt-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-2.5 size-3.5 text-[#8C8375]" />
                  <input
                    type="text"
                    value={inputCoupon}
                    onChange={(e) => setInputCoupon(e.target.value)}
                    placeholder="Coupon code (e.g. WELCOME20)"
                    className="w-full rounded-xl border border-[#EDE5D8] bg-[#FFFDF9] py-2 pl-9 pr-3 text-xs font-medium text-[#1C1C1E] placeholder:text-[#9E9588] uppercase focus:border-[#FFB347] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl border border-[#FFD099] bg-[#FFF5E6] px-3 py-2 text-xs font-bold text-[#FF7B00] hover:bg-[#FF7B00] hover:text-white transition-colors"
                >
                  Apply
                </button>
              </div>

              {promoCode && (
                <div className="mt-2 flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1">
                  <span>Coupon <strong>{promoCode}</strong> applied ({discountPercentage}% OFF)</span>
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="text-[11px] text-[#B42318] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </form>

            {/* Price Breakdown */}
            <div className="border-t border-[#F0EAE1] pt-3 space-y-1.5 text-xs">
              {totalDuration > 0 ? (
                <div className="flex justify-between text-[#665E55]">
                  <span>Total Duration</span>
                  <span className="font-medium text-[#1C1C1E]">{totalDuration} mins</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#665E55]">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount ({discountPercentage}%)</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-[#1C1C1E] pt-2 border-t border-[#F0EAE1]">
                <span>Total Payable</span>
                <span className="text-[#FF7B00]">₹{totalAmount}</span>
              </div>
            </div>

            {/* Confirm Booking CTA */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7B00] to-[#E66F00] py-3.5 text-sm font-bold text-white shadow-md shadow-[#FF7B00]/30 hover:opacity-95 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Confirming Appointment...</span>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
