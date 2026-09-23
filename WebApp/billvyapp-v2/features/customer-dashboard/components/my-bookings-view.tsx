'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  RotateCcw,
  Scissors,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCustomerBookingStore } from '../stores/customer-booking.store';
import type { CustomerBooking } from '../types';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

type BookingTab = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export function MyBookingsView() {
  const router = useRouter();
  const bookings = useCustomerBookingStore((s) => s.bookings);
  const cancelBooking = useCustomerBookingStore((s) => s.cancelBooking);
  const setSelectedSalon = useCustomerBookingStore((s) => s.setSelectedSalon);

  const [activeTab, setActiveTab] = useState<BookingTab>('UPCOMING');
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<CustomerBooking | null>(null);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    return b.status === activeTab;
  });

  const handleCancel = (bookingId: string) => {
    cancelBooking(bookingId);
    toast.success('Appointment cancelled successfully.');
    if (selectedBookingForModal?.id === bookingId) {
      setSelectedBookingForModal(null);
    }
  };

  const handleBookAgain = (booking: CustomerBooking) => {
    setSelectedSalon(booking.salon);
    router.push(`${ROUTES.dashboard.customer.salons}/${booking.salon.id}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E]">
          My Bookings
        </h1>
        <p className="text-xs sm:text-sm text-[#7D766C]">
          View your upcoming and past appointments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFE8DC] pb-3 overflow-x-auto">
        {(['UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'] as BookingTab[]).map((tab) => {
          const count =
            tab === 'ALL'
              ? bookings.length
              : bookings.filter((b) => b.status === tab).length;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
                activeTab === tab
                  ? 'bg-[#FF7B00] text-white shadow-sm shadow-[#FF7B00]/25'
                  : 'bg-[#FFFDF9] border border-[#EDE5D8] text-[#524B40] hover:bg-[#FAF5ED]',
              )}
            >
              {tab === 'UPCOMING'
                ? 'Upcoming'
                : tab === 'COMPLETED'
                  ? 'Completed'
                  : tab === 'CANCELLED'
                    ? 'Cancelled'
                    : 'All Appointments'}{' '}
              ({count})
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="grid gap-4 sm:gap-5">
          {filteredBookings.map((b) => {
            const isUpcoming = b.status === 'UPCOMING';
            const isCompleted = b.status === 'COMPLETED';
            const isCancelled = b.status === 'CANCELLED';

            return (
              <div
                key={b.id}
                className="group rounded-3xl border border-[#EDE5D8] bg-white p-5 sm:p-6 shadow-2xs hover:border-[#FFB347] transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Salon Details & Info */}
                  <div className="flex items-start gap-4">
                    <img
                      src={b.salon.image}
                      alt={b.salon.name}
                      className="size-16 sm:size-20 shrink-0 rounded-2xl object-cover"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-[#1C1C1E]">
                          {b.salon.name}
                        </h3>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            isUpcoming && 'bg-amber-100 text-amber-800',
                            isCompleted && 'bg-emerald-100 text-emerald-800',
                            isCancelled && 'bg-rose-100 text-rose-800',
                          )}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#7D766C]">
                        <MapPin className="size-3 text-[#FF7B00]" />
                        <span>{b.salon.area}, {b.salon.city}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#4A453E] pt-1">
                        <span className="flex items-center gap-1 text-[#FF7B00] font-bold">
                          <Calendar className="size-3.5" />
                          {b.date}
                        </span>
                        <span className="flex items-center gap-1 text-[#FF7B00] font-bold">
                          <Clock className="size-3.5" />
                          {b.time}
                        </span>
                        <span className="text-[#8C8375]">
                          ({b.totalDuration} mins)
                        </span>
                      </div>

                      {/* Services Pills */}
                      <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                        {b.services.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-lg bg-[#FAF5ED] border border-[#EFE8DC] px-2 py-0.5 text-[11px] text-[#665D50]"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#F5EFE6]">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-[#8C8375] block">Total Paid</span>
                      <span className="text-base sm:text-lg font-extrabold text-[#1C1C1E]">
                        ₹{b.totalAmount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUpcoming && (
                        <button
                          type="button"
                          onClick={() => handleCancel(b.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleBookAgain(b)}
                        className="rounded-xl border border-[#FFD099] bg-[#FFF8EE] px-3 py-1.5 text-xs font-bold text-[#FF7B00] hover:bg-[#FF7B00] hover:text-white transition-colors"
                      >
                        Book Again
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBookingForModal(b)}
                        className="rounded-xl border border-[#EDE5D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4A453E] hover:bg-[#FAF5ED] transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-12 text-center space-y-3">
          <Scissors className="size-10 text-[#C4A46C] mx-auto opacity-75" />
          <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
            No {activeTab.toLowerCase()} appointments found
          </h3>
          <p className="text-xs text-[#7D766C] max-w-sm mx-auto">
            Explore our curated salons to book your next hair, beauty, or grooming session.
          </p>
          <div className="pt-2">
            <Link
              href={ROUTES.dashboard.customer.root}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF7B00] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E66F00] transition-colors"
            >
              <span>Explore Salons</span>
            </Link>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#EDE5D8] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#1C1C1E]">
                  Appointment Details
                </h3>
                <p className="text-xs text-[#8C8375]">
                  Code: {selectedBookingForModal.bookingCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                className="rounded-full p-1 text-[#7D766C] hover:bg-[#FAF5ED]"
              >
                ✕
              </button>
            </div>

            {/* Salon Info */}
            <div className="flex items-start gap-3 rounded-2xl bg-[#FFFDF9] border border-[#EDE5D8] p-3.5">
              <img
                src={selectedBookingForModal.salon.image}
                alt={selectedBookingForModal.salon.name}
                className="size-14 rounded-xl object-cover"
              />
              <div>
                <h4 className="font-bold text-sm text-[#1C1C1E]">
                  {selectedBookingForModal.salon.name}
                </h4>
                <p className="text-xs text-[#7D766C]">{selectedBookingForModal.salon.fullAddress}</p>
                <p className="text-xs text-[#7D766C] mt-0.5">{selectedBookingForModal.salon.phone}</p>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[#EDE5D8] p-3">
                <span className="text-[#8C8375] block">Date</span>
                <span className="font-bold text-[#1C1C1E]">{selectedBookingForModal.date}</span>
              </div>
              <div className="rounded-xl border border-[#EDE5D8] p-3">
                <span className="text-[#8C8375] block">Time</span>
                <span className="font-bold text-[#1C1C1E]">{selectedBookingForModal.time}</span>
              </div>
            </div>

            {/* Services */}
            <div>
              <span className="text-xs font-bold text-[#8C8375] uppercase tracking-wider block mb-2">
                Services
              </span>
              <div className="space-y-2">
                {selectedBookingForModal.services.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex justify-between items-center text-xs py-1 border-b border-[#F5EFE6]"
                  >
                    <span>{svc.name} ({svc.durationMinutes}m)</span>
                    <span className="font-bold">₹{svc.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price & Total */}
            <div className="pt-2 border-t border-[#F0EAE1] flex justify-between items-center text-xs">
              <span className="font-bold text-[#665E55]">Total Amount</span>
              <span className="text-base font-extrabold text-[#FF7B00]">
                ₹{selectedBookingForModal.totalAmount}
              </span>
            </div>

            {/* Close */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                className="w-full rounded-xl bg-[#FAF5ED] border border-[#EDE5D8] py-2.5 text-xs font-bold text-[#4A453E] hover:bg-[#F5EFE6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
