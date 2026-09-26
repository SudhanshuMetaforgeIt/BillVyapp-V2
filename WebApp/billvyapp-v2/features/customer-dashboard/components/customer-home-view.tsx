'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Award, CalendarDays, Clock, Crown, Receipt, Search } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDate } from '@/lib/format';
import {
  useCustomerSalons,
  useMyAppointments,
  useMyBills,
  useMyCustomer,
  useMyLoyaltyBalance,
  useMyMemberships,
  useMyNotifications,
} from '../hooks/use-customer-portal';
import { APPOINTMENT_STATUS, CUSTOMER_CANCELLABLE, formatTimeOfDay } from './customer-status';
import { useSalonNames } from './my-bookings-view';
import { SalonCard } from './salon-card';
import {
  CustomerCard,
  CustomerEmpty,
  CustomerError,
  CustomerLoading,
  CustomerPill,
  customerOutlineButton,
  customerPrimaryButton,
} from './customer-ui';

const C = ROUTES.dashboard.customer;

function StatTile({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-[#EDE5D8] bg-white p-4 transition-colors hover:border-[#FFB347]"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-[#FFF3E5] text-[#FF7B00]">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-[#7D766C]">{label}</p>
        <p className="font-heading text-xl font-extrabold text-[#1C1C1E]">{value}</p>
      </div>
    </Link>
  );
}

export function CustomerHomeView() {
  const user = useCurrentUser();
  const me = useMyCustomer();
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = useMyAppointments({ page: 1, limit: 10, dateFrom: today });
  const loyalty = useMyLoyaltyBalance();
  const memberships = useMyMemberships({ page: 1, limit: 1 });
  const bills = useMyBills({ page: 1, limit: 1 });
  const notifications = useMyNotifications({ page: 1, limit: 3 });
  const salons = useCustomerSalons({ page: 1, limit: 4 });
  const salonNames = useSalonNames();
  const firstName = me.data?.firstName || user?.firstName;

  const nextVisits = (upcoming.data?.data ?? []).filter((a) => CUSTOMER_CANCELLABLE.includes(a.status)).slice(0, 3);

  return (
    <div className="space-y-8 pb-16">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF3E5] via-[#FFE9D1] to-[#FFD8A8] p-6 sm:p-10">
        <p className="text-sm font-semibold text-[#B45309]">Hello{firstName ? `, ${firstName}` : ''}</p>
        <h1 className="mt-1 max-w-xl font-heading text-3xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-4xl">
          Book your next salon visit
        </h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={C.salons} className={customerPrimaryButton}>
            <Search className="size-4" />
            Find a salon
          </Link>
          <Link href={C.myBookings} className={customerOutlineButton}>
            My bookings
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={<Award className="size-5" />}
          label="Loyalty points"
          value={loyalty.isLoading ? '…' : loyalty.isError ? '—' : (loyalty.data?.balance ?? 0).toLocaleString('en-IN')}
          href={C.rewards}
        />
        <StatTile
          icon={<Crown className="size-5" />}
          label="Memberships"
          value={memberships.isLoading ? '…' : memberships.isError ? '—' : String(memberships.data?.meta.total ?? 0)}
          href={C.rewards}
        />
        <StatTile
          icon={<Receipt className="size-5" />}
          label="Bills"
          value={bills.isLoading ? '…' : bills.isError ? '—' : String(bills.data?.meta.total ?? 0)}
          href={C.bills}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">Upcoming visits</h2>
          <Link href={C.myBookings} className="text-xs font-semibold text-[#FF7B00] hover:underline">
            See all
          </Link>
        </div>
        {upcoming.isLoading ? (
          <CustomerLoading />
        ) : upcoming.isError && !upcoming.data ? (
          <CustomerError error={upcoming.error} onRetry={() => void upcoming.refetch()} />
        ) : nextVisits.length === 0 ? (
          <CustomerEmpty icon={<CalendarDays className="size-8" />} title="No upcoming visits" message="Your next booking will show here." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {nextVisits.map((a) => {
              const status = APPOINTMENT_STATUS[a.status];
              return (
                <CustomerCard key={a.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-[#1C1C1E]">{salonNames.get(a.salonId) ?? 'Salon'}</p>
                    <CustomerPill label={status.label} tone={status.tone} />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-[#665E55]">
                    <CalendarDays className="size-3.5 text-[#FF7B00]" />
                    {formatDate(a.appointmentDate)}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-[#665E55]">
                    <Clock className="size-3.5 text-[#FF7B00]" />
                    {formatTimeOfDay(a.startTime)}
                  </p>
                  <p className="truncate text-xs text-[#7D766C]">{a.services.map((s) => s.name).join(', ')}</p>
                </CustomerCard>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">Recent notices</h2>
          <Link href={C.notifications} className="text-xs font-semibold text-[#FF7B00] hover:underline">
            See all
          </Link>
        </div>
        {notifications.isLoading ? (
          <CustomerLoading />
        ) : notifications.isError && !notifications.data ? (
          <CustomerError error={notifications.error} onRetry={() => void notifications.refetch()} />
        ) : (notifications.data?.data.length ?? 0) === 0 ? (
          <CustomerEmpty title="No notices" message="Delivery updates will appear here when they are sent." />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {notifications.data?.data.map((n) => (
              <CustomerCard key={n.id} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8C8375]">{n.channel}</p>
                <p className="text-sm font-bold text-[#1C1C1E]">{n.subject?.trim() || n.notificationType}</p>
                <p className="line-clamp-2 text-xs text-[#665E55]">{n.message}</p>
                <p className="text-[11px] text-[#8C8375]">{n.status}</p>
              </CustomerCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">Salons</h2>
          <Link href={C.salons} className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF7B00] hover:underline">
            Browse all
            <ArrowRight className="size-3" />
          </Link>
        </div>
        {salons.isLoading ? (
          <CustomerLoading />
        ) : salons.isError && !salons.data ? (
          <CustomerError error={salons.error} onRetry={() => void salons.refetch()} />
        ) : (salons.data?.data.length ?? 0) === 0 ? (
          <CustomerEmpty title="No salons yet" message="Salons will appear here once they open for booking." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {salons.data?.data.map((s) => (
              <SalonCard key={s.id} salon={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
