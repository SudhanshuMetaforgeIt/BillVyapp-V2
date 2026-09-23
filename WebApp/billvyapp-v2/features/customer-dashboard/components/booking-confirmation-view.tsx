'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  Phone,
  Scissors,
} from 'lucide-react';

import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { ROUTES } from '@/constants/routes';

export function BookingConfirmationView() {
  const bookings = useCustomerBookingStore((s) => s.bookings);
  const latestBooking = bookings[0]; // Most recently booked

  if (!latestBooking) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-[#EDE5D8] bg-white p-8 text-center space-y-4 my-8">
        <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">
          No Recent Booking Found
        </h2>
        <Link
          href={ROUTES.dashboard.customer.root}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF7B00] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E66F00] transition-colors"
        >
          <span>Return Home</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6 pb-20 space-y-6">
      {/* Confirmation Card */}
      <div className="overflow-hidden rounded-3xl border border-[#EDE5D8] bg-white p-6 sm:p-8 shadow-sm text-center">
        {/* Animated Check icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="size-10" />
        </div>

        <span className="mt-4 inline-block rounded-full bg-[#FFF2E0] px-3 py-1 text-xs font-bold text-[#FF7B00] uppercase tracking-wider">
          Appointment Confirmed
        </span>

        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1C1E]">
          You&apos;re all set!
        </h1>

        <p className="mt-1 text-xs sm:text-sm text-[#7D766C]">
          Your salon booking has been successfully placed. We&apos;ve sent an SMS confirmation to your registered number.
        </p>

        {/* Booking ID badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#EBE3D7] bg-[#FFFDF9] px-4 py-2 text-xs font-medium text-[#4A453E]">
          <span className="text-[#8C8375]">Booking ID:</span>
          <span className="font-bold text-[#1C1C1E]">{latestBooking.bookingCode}</span>
        </div>

        {/* Details Card */}
        <div className="mt-6 rounded-2xl border border-[#EDE5D8] bg-[#FFFDF9] p-5 text-left space-y-4">
          {/* Salon */}
          <div className="flex items-start gap-3.5 pb-3 border-b border-[#F0EAE1]">
            <img
              src={latestBooking.salon.image}
              alt={latestBooking.salon.name}
              className="size-14 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-heading text-base font-bold text-[#1C1C1E]">
                {latestBooking.salon.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-[#7D766C] mt-0.5">
                <MapPin className="size-3 text-[#FF7B00]" />
                <span>{latestBooking.salon.area}, {latestBooking.salon.city}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#7D766C] mt-0.5">
                <Phone className="size-3 text-[#FF7B00]" />
                <span>{latestBooking.salon.phone}</span>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white border border-[#EDE5D8] p-3">
              <span className="text-[#8C8375] block">Date</span>
              <span className="font-bold text-[#1C1C1E] flex items-center gap-1.5 mt-0.5">
                <Calendar className="size-3.5 text-[#FF7B00]" />
                {latestBooking.date}
              </span>
            </div>
            <div className="rounded-xl bg-white border border-[#EDE5D8] p-3">
              <span className="text-[#8C8375] block">Time</span>
              <span className="font-bold text-[#1C1C1E] flex items-center gap-1.5 mt-0.5">
                <Clock className="size-3.5 text-[#FF7B00]" />
                {latestBooking.time}
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <span className="text-xs font-bold text-[#8C8375] uppercase tracking-wider block mb-1.5">
              Booked Services
            </span>
            <div className="space-y-1.5">
              {latestBooking.services.map((svc) => (
                <div
                  key={svc.id}
                  className="flex justify-between items-center text-xs py-1 border-b border-[#F5EFE6] last:border-0"
                >
                  <span className="font-medium text-[#1C1C1E]">{svc.name}</span>
                  <span className="font-semibold text-[#1C1C1E]">₹{svc.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-2 border-t border-[#F0EAE1] flex justify-between items-center text-xs">
            <span className="font-bold text-[#665E55]">Total Amount</span>
            <span className="text-base font-extrabold text-[#FF7B00]">
              ₹{latestBooking.totalAmount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={ROUTES.dashboard.customer.myBookings}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7B00] to-[#E66F00] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#FF7B00]/25 hover:opacity-95 transition-all"
          >
            <span>View My Bookings</span>
            <ArrowRight className="size-4" />
          </Link>

          <Link
            href={ROUTES.dashboard.customer.root}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EDE5D8] bg-[#FFFDF9] px-6 py-3 text-xs font-bold text-[#4A453E] hover:bg-white hover:border-[#FFB347] transition-all"
          >
            <Home className="size-4 text-[#8C8375]" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
