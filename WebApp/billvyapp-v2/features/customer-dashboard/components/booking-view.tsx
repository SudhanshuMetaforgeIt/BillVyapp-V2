'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarDays, Check, Clock, Scissors } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { businessToday } from '@/lib/business-calendar';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useBookAppointment, useCustomerSalon, useSalonServiceList } from '../hooks/use-customer-portal';
import {
  CustomerCard,
  CustomerEmpty,
  CustomerError,
  CustomerField,
  CustomerLoading,
  CustomerMutationError,
  CustomerPageTitle,
  customerInput,
  customerPrimaryButton,
} from './customer-ui';

export function BookingView() {
  const router = useRouter();
  const params = useSearchParams();
  const salonId = params.get('salonId') ?? undefined;
  const initialServices = useMemo(
    () => (params.get('services') ?? '').split(',').filter(Boolean),
    [params],
  );

  const [selected, setSelected] = useState<string[]>(initialServices);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const salonQuery = useCustomerSalon(salonId);
  const servicesQuery = useSalonServiceList({ salonId, page: 1, limit: 100 });
  const book = useBookAppointment();

  const today = businessToday();

  if (!salonId) {
    return (
      <CustomerEmpty
        icon={<Scissors className="size-8" />}
        title="Choose a salon first"
        message="Pick a salon and its services, then choose a date and time."
        action={
          <Link href={ROUTES.dashboard.customer.salons} className={customerPrimaryButton}>
            Browse salons
          </Link>
        }
      />
    );
  }

  if (salonQuery.isLoading || servicesQuery.isLoading) return <CustomerLoading label="Preparing your booking…" />;
  if (salonQuery.isError || !salonQuery.data) {
    return <CustomerError error={salonQuery.error} onRetry={() => void salonQuery.refetch()} />;
  }

  const salon = salonQuery.data;
  const services = servicesQuery.data?.data ?? [];
  const chosen = services.filter((s) => selected.includes(s.id));
  const estimatedTotal = chosen.reduce((sum, s) => sum + Number(s.price), 0);
  const totalMinutes = chosen.reduce((sum, s) => sum + s.durationMinutes, 0);
  const canSubmit = chosen.length > 0 && date >= today && /^\d{2}:\d{2}$/.test(time) && !book.isPending;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    book.mutate(
      {
        salonId: salon.id,
        appointmentDate: date,
        startTime: time,
        notes: notes.trim() || null,
        services: chosen.map((s) => ({ serviceId: s.id })),
      },
      {
        onSuccess: (appointment) => {
          toast.success(`Booking ${appointment.appointmentNumber} requested`);
          router.push(ROUTES.dashboard.customer.myBookings);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      <Link
        href={ROUTES.dashboard.customer.salon(salon.id)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D766C] hover:text-[#FF7B00]"
      >
        <ArrowLeft className="size-3.5" />
        Back to {salon.name}
      </Link>

      <CustomerPageTitle title="Book an appointment" subtitle={salon.name} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          <CustomerCard>
            <h2 className="mb-3 text-sm font-bold text-[#1C1C1E]">Services</h2>
            {servicesQuery.isError && !servicesQuery.data ? (
              <CustomerError error={servicesQuery.error} onRetry={() => void servicesQuery.refetch()} />
            ) : services.length === 0 ? (
              <p className="text-xs text-[#7D766C]">This salon has no bookable services yet.</p>
            ) : (
              <ul className="space-y-2">
                {services.map((service) => {
                  const isSelected = selected.includes(service.id);
                  return (
                    <li key={service.id}>
                      <button
                        type="button"
                        onClick={() => toggle(service.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                          isSelected ? 'border-[#FF7B00] bg-[#FFF7EE]' : 'border-[#EDE5D8] hover:border-[#FFB347]',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'flex size-5 items-center justify-center rounded-full border',
                              isSelected ? 'border-[#FF7B00] bg-[#FF7B00] text-white' : 'border-[#E5DDCF] text-transparent',
                            )}
                          >
                            <Check className="size-3" />
                          </span>
                          <span className="font-semibold text-[#1C1C1E]">{service.name}</span>
                          <span className="text-xs text-[#7D766C]">{service.durationMinutes} min</span>
                        </span>
                        <span className="font-bold text-[#1C1C1E]">{formatCurrency(service.price)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CustomerCard>

          <CustomerCard>
            <h2 className="mb-3 text-sm font-bold text-[#1C1C1E]">Date & time</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomerField label="Date" htmlFor="booking-date">
                <input
                  id="booking-date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={customerInput}
                  required
                />
              </CustomerField>
              <CustomerField label="Start time" htmlFor="booking-time">
                <input
                  id="booking-time"
                  type="time"
                  step={900}
                  value={time}
                  onChange={(e) => setTime(e.target.value.slice(0, 5))}
                  className={customerInput}
                  required
                />
              </CustomerField>
              <div className="sm:col-span-2">
                <CustomerField label="Notes for the salon (optional)" htmlFor="booking-notes">
                  <textarea
                    id="booking-notes"
                    rows={3}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={customerInput}
                  />
                </CustomerField>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#8C8375]">
              The salon confirms your request. If the time is unavailable you will see a message and can pick another.
            </p>
          </CustomerCard>
        </div>

        <CustomerCard className="h-fit space-y-4 lg:sticky lg:top-24">
          <h2 className="text-sm font-bold text-[#1C1C1E]">Summary</h2>
          {chosen.length === 0 ? (
            <p className="text-xs text-[#7D766C]">Select at least one service.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-[#4A453E]">
              {chosen.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span>{s.name}</span>
                  <span className="font-semibold">{formatCurrency(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-1 border-t border-[#F0EAE1] pt-3 text-xs text-[#665E55]">
            {date ? (
              <p className="flex items-center gap-2">
                <CalendarDays className="size-3.5 text-[#FF7B00]" />
                {formatDate(date)}
                {time ? ` at ${time}` : ''}
              </p>
            ) : null}
            {totalMinutes > 0 ? (
              <p className="flex items-center gap-2">
                <Clock className="size-3.5 text-[#FF7B00]" />
                About {totalMinutes} min
              </p>
            ) : null}
          </div>
          <div className="flex items-baseline justify-between border-t border-[#F0EAE1] pt-3">
            <span className="text-xs font-semibold text-[#4A453E]">Estimated price</span>
            <span className="text-lg font-extrabold text-[#1C1C1E]">{formatCurrency(estimatedTotal)}</span>
          </div>
          <p className="text-[11px] text-[#8C8375]">Taxes and the final amount appear on your bill after the visit.</p>

          <CustomerMutationError error={book.error} />

          <button type="submit" className={cn(customerPrimaryButton, 'w-full')} disabled={!canSubmit}>
            {book.isPending ? 'Requesting…' : 'Request booking'}
          </button>
        </CustomerCard>
      </div>
    </form>
  );
}
