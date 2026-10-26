'use client';

import { useState } from 'react';
import { ArrowRight, Building2, CalendarCheck2, CalendarDays, CheckCircle2, Clock3, GraduationCap, Mail, Plus, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectInput } from '@/components/data/form-fields';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { api } from '@/services/api-client';
import { formatDate } from '@/lib/format';
import { businessToday } from '@/lib/business-calendar';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { getSalon } from '@/features/salons/services/salons.service';
import { SectionErrorState } from '@/components/layout/section-states';
import { AppointmentsPagination } from '@/features/appointments/components/appointments-pagination';
import type { AppointmentApiItem, AppointmentStatus, PaginatedResponse } from '@/features/appointments/types/appointments.types';
import { InstituteBookingForm } from './institute-booking-form';
import { InstituteAppointmentDetails } from './institute-appointment-details';

const statuses: Array<{ value: AppointmentStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' }, { value: 'PENDING', label: 'Awaiting confirmation' },
  { value: 'CONFIRMED', label: 'Confirmed' }, { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' }, { value: 'CANCELLED', label: 'Cancelled' }, { value: 'NO_SHOW', label: 'No show' },
];

function BookingCard({ appointment, onView }: { appointment: AppointmentApiItem; onView: () => void }) {
  const female = appointment.studentGender === 'FEMALE';
  const hasEmailIssue = appointment.emailNotifications?.some(email => ['FAILED', 'UNKNOWN'].includes(email.status));
  const statusLabel = statuses.find(status => status.value === appointment.status)?.label ?? appointment.status;
  return <article className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={cn('flex size-11 items-center justify-center rounded-xl', female ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}><Users className="size-5" /></div><div><p className="font-bold">{appointment.appointmentNumber}</p><p className="mt-0.5 text-xs text-text-secondary">{female ? 'Female' : 'Male'} group · {appointment.studentCount} students</p></div></div><StatusBadge label={statusLabel} tone={appointment.status === 'COMPLETED' ? 'success' : appointment.status === 'CONFIRMED' ? 'info' : appointment.status === 'PENDING' ? 'warning' : 'neutral'} /></div>
    <div className="my-4 grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2"><div className="flex gap-2.5"><CalendarDays className="mt-0.5 size-4 shrink-0 text-text-secondary" /><div><p className="text-sm font-semibold">{formatDate(appointment.appointmentDate)}</p><p className="mt-0.5 text-xs text-text-secondary">{appointment.startTime.slice(0, 5)}–{appointment.endTime.slice(0, 5)}</p></div></div><div className="flex gap-2.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-text-secondary" /><div><p className="text-sm font-semibold">{appointment.contactName}</p><p className="mt-0.5 text-xs text-text-secondary">{appointment.contactRole} · {appointment.contactPhone}</p></div></div></div>
    <div className="flex min-h-7 flex-wrap items-start gap-1.5">{appointment.services.slice(0, 3).map(service => <span key={service.id} className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary">{service.name}</span>)}{appointment.services.length > 3 && <span className="px-2 py-1 text-[11px] text-text-secondary">+{appointment.services.length - 3} more</span>}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"><span className={cn('flex items-center gap-1.5 text-xs', hasEmailIssue ? 'text-danger' : 'text-text-secondary')}><Mail className="size-3.5" />{hasEmailIssue ? 'Email needs attention' : appointment.instituteInvoice?.status === 'COMPLETED' ? 'Invoice available' : 'View progress & email status'}</span><Button size="sm" variant="outline" onClick={onView}>View booking <ArrowRight className="size-3.5" /></Button></div>
  </article>;
}

export function InstituteAppointmentsView() {
  const user = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [date, setDate] = useState('');
  const [upcoming, setUpcoming] = useState(false);
  const [search, setSearch] = useState('');
  const location = useScopedQuery(['salons', 'institute-location', user?.salonId], () => getSalon(user!.salonId!), { enabled: Boolean(user?.salonId), staleTime: 300000 });
  const summary = useScopedQuery(['appointments', 'institute-summary', user?.salonId], async () => {
    const counts = await Promise.all(['', 'PENDING', 'CONFIRMED', 'COMPLETED'].map(value => api.get<PaginatedResponse<AppointmentApiItem>>('/appointments', { params: { salonId: user?.salonId, page: 1, limit: 1, status: value || undefined } })));
    return counts.map(result => result.meta.total);
  }, { enabled: Boolean(user?.salonId), staleTime: 30000, refetchOnWindowFocus: true });
  const query = useScopedQuery(['appointments', 'institute-staff', user?.salonId, page, status, date, upcoming], () => api.get<PaginatedResponse<AppointmentApiItem>>('/appointments', { params: { salonId: user?.salonId, page, limit: 10, status: status || undefined, dateFrom: date || (upcoming ? businessToday() : undefined), dateTo: date || undefined } }), { enabled: Boolean(user?.salonId), placeholderData: undefined, staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 15000 });
  const needle = search.trim().toLowerCase();
  const rows = (query.data?.data ?? []).filter(appointment => !needle || [appointment.appointmentNumber, appointment.contactName, appointment.contactPhone, ...appointment.services.map(service => service.name)].some(value => value?.toLowerCase().includes(needle)));
  const stats = [
    { label: 'Total bookings', icon: CalendarDays, value: '', color: 'bg-champagne-light text-charcoal' },
    { label: 'Awaiting confirmation', icon: Clock3, value: 'PENDING', color: 'bg-amber-50 text-amber-700' },
    { label: 'Confirmed', icon: CalendarCheck2, value: 'CONFIRMED', color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed', icon: CheckCircle2, value: 'COMPLETED', color: 'bg-emerald-light text-emerald' },
  ] as const;
  function clearFilters() { setStatus(''); setDate(''); setUpcoming(false); setSearch(''); setPage(1); }
  if (!user?.salonId) return <SectionErrorState message="Your administrator must assign an institute location before you can book student services." />;
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-champagne-light/60 via-surface to-surface p-6 sm:p-8">
      <GraduationCap aria-hidden className="pointer-events-none absolute -right-5 -top-8 size-56 rotate-[-12deg] text-champagne/10" />
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div className="max-w-xl"><span className="inline-flex items-center gap-1.5 rounded-full border border-champagne/30 bg-surface/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary"><GraduationCap className="size-3.5" />Institute care</span><h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Student appointments</h1><p className="mt-2 text-sm leading-relaxed text-text-secondary">Plan a little care for your students. Book a group, follow its progress, and find every invoice in one place.</p><p className="mt-4 flex items-center gap-2 text-xs font-medium"><Building2 className="size-3.5 text-text-secondary" />{location.data?.name ?? 'Your assigned institute location'}<span className="mx-1 text-border">|</span><ShieldCheck className="size-3.5 text-emerald" />Student privacy protected</p></div><div className="flex flex-wrap gap-2"><PrefetchLink href={ROUTES.dashboard.staff.bills} className={buttonVariants({ variant: 'outline' })}>Invoices & payments</PrefetchLink><Button onClick={() => setCreating(true)}><Plus className="size-4" />Book student services</Button></div></div>
    </section>
    <section aria-label="Booking overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((stat, index) => <button key={stat.label} type="button" onClick={() => { setStatus(stat.value); setPage(1); }} aria-pressed={status === stat.value} className={cn('flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left transition hover:border-champagne sm:p-5', status === stat.value ? 'border-champagne shadow-sm' : 'border-border')}><span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', stat.color)}><stat.icon className="size-5" /></span><span><span className="block text-xs text-text-secondary">{stat.label}</span><span className="mt-1 block text-2xl font-bold tabular-nums">{summary.isLoading ? '…' : summary.data?.[index]?.toLocaleString() ?? '—'}</span></span></button>)}</section>
    <section className="space-y-4" aria-label="Your appointments">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Your bookings</h2><p className="mt-0.5 text-xs text-text-secondary">Separate male and female groups. Always one clear view.</p></div><Button size="sm" variant="ghost" disabled={query.isFetching} onClick={() => { void query.refetch(); void summary.refetch(); }}><RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />Refresh</Button></div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3"><div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-text-secondary" /><Input aria-label="Search bookings on this page" placeholder="Search bookings on this page…" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div><SelectInput aria-label="Appointment status" className="w-full sm:w-52" value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }} options={statuses} /><Input aria-label="Filter by appointment date" type="date" className="w-full sm:w-44" value={date} onChange={event => { setDate(event.target.value); setUpcoming(false); setPage(1); }} /><button type="button" aria-pressed={upcoming} onClick={() => { setUpcoming(value => !value); setDate(''); setPage(1); }} className={cn('h-10 rounded-lg border px-3 text-xs font-medium', upcoming ? 'border-champagne bg-champagne-light' : 'border-border hover:bg-muted')}>Today & later</button>{(status || date || upcoming || search) && <button type="button" onClick={clearFilters} className="text-xs font-medium text-text-secondary underline underline-offset-4">Clear filters</button>}</div>
      {query.isLoading ? <div role="status" aria-label="Loading appointments" className="grid gap-4 xl:grid-cols-2">{[0, 1, 2, 3].map(value => <div key={value} className="h-56 animate-pulse rounded-2xl border border-border bg-muted/40" />)}</div> : query.isError ? <div className="app-surface-card"><SectionErrorState message="Could not load appointments." onRetry={() => void query.refetch()} /></div> : !rows.length ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-champagne-light"><CalendarDays className="size-7" /></div><h3 className="font-bold">{needle || status || date || upcoming ? 'No matching bookings' : 'Your first group starts here'}</h3><p className="mt-2 max-w-sm text-sm text-text-secondary">{needle ? 'Try another search on this page, or move to another page.' : status || date || upcoming ? 'Try another status or date to find your appointment.' : 'Book services for your students using only your institute contact details.'}</p><Button className="mt-5" variant="outline" onClick={needle || status || date || upcoming ? clearFilters : () => setCreating(true)}>{needle || status || date || upcoming ? 'Clear filters' : 'Book student services'}</Button></div> : <div className="grid gap-4 xl:grid-cols-2">{rows.map(appointment => <BookingCard key={appointment.id} appointment={appointment} onView={() => setViewing(appointment.id)} />)}</div>}
      {query.data && query.data.meta.total > 0 && <div className="rounded-xl border border-border bg-surface"><AppointmentsPagination meta={query.data.meta} onPageChange={value => { setPage(value); setSearch(''); }} /></div>}
    </section>
    {creating && <InstituteBookingForm onClose={() => { setCreating(false); void query.refetch(); void summary.refetch(); }} />}
    {viewing && <InstituteAppointmentDetails id={viewing} onClose={() => setViewing(null)} />}
  </div>;
}
