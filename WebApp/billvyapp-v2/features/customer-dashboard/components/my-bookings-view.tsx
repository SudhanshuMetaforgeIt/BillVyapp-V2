'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/types/models';
import { useCancelAppointment, useCustomerSalons, useMyAppointments } from '../hooks/use-customer-portal';
import { APPOINTMENT_STATUS, CUSTOMER_CANCELLABLE, formatTimeOfDay } from './customer-status';
import {
  CustomerCard,
  CustomerEmpty,
  CustomerError,
  CustomerLoading,
  CustomerMutationError,
  CustomerPageTitle,
  CustomerPagination,
  CustomerPill,
  customerOutlineButton,
  customerPrimaryButton,
} from './customer-ui';

const PAGE_SIZE = 10;

const TABS: { id: AppointmentStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Requested' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

/** Names for the salons shown on this page; the appointment payload only carries salonId. */
export function useSalonNames() {
  const salons = useCustomerSalons({ page: 1, limit: 100 });
  return useMemo(
    () => new Map((salons.data?.data ?? []).map((s) => [s.id, s.name])),
    [salons.data],
  );
}

function BookingCard({ appointment, salonName }: { appointment: Appointment; salonName: string }) {
  const cancel = useCancelAppointment();
  const [confirming, setConfirming] = useState(false);
  const status = APPOINTMENT_STATUS[appointment.status];
  const cancellable = CUSTOMER_CANCELLABLE.includes(appointment.status);
  const estimated = appointment.services.reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <CustomerCard className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8375]">
            {appointment.appointmentNumber}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-[#1C1C1E]">
            <MapPin className="size-3.5 text-[#FF7B00]" />
            {salonName}
          </p>
        </div>
        <CustomerPill label={status.label} tone={status.tone} />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#665E55]">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-[#FF7B00]" />
          {formatDate(appointment.appointmentDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-[#FF7B00]" />
          {formatTimeOfDay(appointment.startTime)} – {formatTimeOfDay(appointment.endTime)}
        </span>
      </div>

      <ul className="space-y-1 border-t border-[#F5EFE6] pt-2 text-xs text-[#4A453E]">
        {appointment.services.map((s) => (
          <li key={s.id} className="flex justify-between gap-2">
            <span>{s.name}</span>
            <span className="font-semibold">{formatCurrency(s.price)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-2 pt-1 text-[#8C8375]">
          <span>Estimated</span>
          <span className="font-semibold">{formatCurrency(estimated)}</span>
        </li>
      </ul>

      {appointment.notes ? <p className="text-xs italic text-[#7D766C]">&ldquo;{appointment.notes}&rdquo;</p> : null}

      {cancellable ? (
        <div className="space-y-2 border-t border-[#F5EFE6] pt-3">
          <CustomerMutationError error={cancel.error} />
          {confirming ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-[#665E55]">Cancel this booking?</span>
              <button type="button" className={customerOutlineButton} onClick={() => setConfirming(false)} disabled={cancel.isPending}>
                Keep it
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-xl bg-[#B42318] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#912018] disabled:opacity-60"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(appointment.id, {
                    onSuccess: () => {
                      toast.success('Booking cancelled');
                      setConfirming(false);
                    },
                  })
                }
              >
                {cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" className={customerOutlineButton} onClick={() => setConfirming(true)}>
                Cancel booking
              </button>
            </div>
          )}
        </div>
      ) : null}
    </CustomerCard>
  );
}

export function MyBookingsView() {
  const [tab, setTab] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const query = useMyAppointments({ page, limit: PAGE_SIZE, status: tab === 'ALL' ? undefined : tab });
  const salonNames = useSalonNames();
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-6 pb-16">
      <CustomerPageTitle
        title="My Bookings"
        subtitle="Your appointment requests and visits"
        action={
          <Link href={ROUTES.dashboard.customer.salons} className={customerPrimaryButton}>
            Book a visit
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Booking status">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              tab === t.id ? 'border-[#FF7B00] bg-[#FFF3E5] text-[#FF7B00]' : 'border-[#EDE5D8] bg-white text-[#4A453E] hover:border-[#FFB347]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <CustomerLoading label="Loading bookings…" />
      ) : query.isError && !query.data ? (
        <CustomerError error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <CustomerEmpty
          icon={<CalendarDays className="size-8" />}
          title="No bookings here"
          message={tab === 'ALL' ? 'Book your first visit from the salon directory.' : 'Nothing with this status.'}
        />
      ) : (
        <>
          <div className={cn('grid gap-4 md:grid-cols-2', query.isFetching && 'opacity-70')}>
            {rows.map((a) => (
              <BookingCard key={a.id} appointment={a} salonName={salonNames.get(a.salonId) ?? 'Salon'} />
            ))}
          </div>
          <CustomerPagination page={page} totalPages={query.data?.meta.totalPages ?? 1} onChange={setPage} disabled={query.isFetching} />
        </>
      )}
    </div>
  );
}
