'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, CheckCircle2, GraduationCap, Info, Minus, Plus, Search, ShieldCheck, Trash2, Users, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectInput } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { api } from '@/services/api-client';
import { isValidPhoneInput, cleanPhoneInput } from '@/lib/phone';
import { businessToday } from '@/lib/business-calendar';
import { formatCurrency } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getSalon } from '@/features/salons/services/salons.service';
import { useSalonServices } from '@/features/walk-in-billing/hooks/use-service-catalog';
import type { AppointmentApiItem } from '@/features/appointments/types/appointments.types';
import { createUuid } from '@/lib/uuid';
import { cn } from '@/lib/utils';

type SelectedService = { id: string; name: string; price: string | number; gender: string };

export function InstituteBookingForm({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [requestKey] = useState(createUuid);
  const [endTime, setEndTime] = useState('12:00');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [count, setCount] = useState('');
  const [contactName, setContactName] = useState(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState<'Warden' | 'Assistant manager'>('Warden');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [comments, setComments] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SelectedService[]>([]);
  const [saved, setSaved] = useState<AppointmentApiItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const location = useScopedQuery(['salons', 'institute-location', user?.salonId], () => getSalon(user!.salonId!), { enabled: Boolean(user?.salonId), staleTime: 300000 });
  const services = useSalonServices(Boolean(gender), { salonId: user?.salonId ?? '', gender: gender || undefined, categoryId: '', search: debouncedSearch });
  const available = (services.data?.data ?? []).filter(service => service.gender === gender);
  const quantity = Number(count);
  const validCount = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 10000;
  const unitEstimate = selected.reduce((sum, service) => sum + Number(service.price), 0);
  const estimate = validCount ? unitEstimate * quantity : 0;
  const valid = gender && validCount && contactName.trim() && isValidPhoneInput(contactPhone) && date >= businessToday() && time && endTime > time && Boolean(user?.salonId) && selected.length > 0;

  function changeCount(delta: number) { setCount(String(Math.min(10000, Math.max(1, (Number(count) || 0) + delta)))); }

  async function submit() {
    if (busy || saved || !valid) return;
    setBusy(true); setError('');
    try {
      if (selected.some(service => service.gender !== gender)) throw new Error('Select services for this group again.');
      const appointment = await api.post<AppointmentApiItem>('/institute-appointments', {
        salonId: user?.salonId, idempotencyKey: requestKey,
        appointmentDate: date, startTime: time, endTime, studentGender: gender, studentCount: quantity,
        contactName: contactName.trim(), contactPhone: cleanPhoneInput(contactPhone), contactRole,
        notes: comments.trim() || undefined, services: selected.map(service => ({ serviceId: service.id })),
      });
      setSaved(appointment);
      void invalidateAfter(queryClient, 'appointments');
    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : 'The request could not be confirmed. Refresh the appointments list before booking again.');
    } finally { setBusy(false); }
  }

  return <Modal open title={saved ? `Booking ${saved.appointmentNumber}` : 'New student appointment'} onClose={onClose} busy={busy} className={cn(saved ? 'max-w-lg' : 'max-w-5xl', '!p-0 [&>div:first-child]:border-b [&>div:first-child]:border-border [&>div:first-child]:px-6 [&>div:first-child]:py-4 [&>div:first-child]:mb-0')}>
    {saved ? <div className="flex flex-col items-center gap-6 p-6 text-center sm:p-9">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-light text-emerald"><CheckCircle2 className="size-7" /></div>
      <h3 className="text-2xl font-bold">Your group appointment is booked.</h3>
      <p className="text-xs text-text-secondary">Track delivery, service progress and your invoice in booking details</p>
      <Button onClick={onClose}>Done <ArrowRight className="size-4" /></Button>
    </div> : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="space-y-7 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-4"><div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-champagne-light text-charcoal"><GraduationCap className="size-7" /></div><div><h3 className="text-xl font-bold sm:text-2xl">Care for your whole group</h3><p className="mt-1 text-sm text-text-secondary">One appointment. The right services for every student.</p></div></div>
        <section className="space-y-3" aria-labelledby="schedule-heading">
          <h4 id="schedule-heading" className="text-sm font-bold">01 <span className="ml-2">Location & schedule</span></h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 text-sm"><p className="font-medium">Your location</p><div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3"><Building2 className="size-4 shrink-0 text-text-secondary" /><span className="truncate">{location.data?.name ?? 'Assigned institute location'}</span></div></div>
            <label className="space-y-1.5 text-sm font-medium">Appointment date *<Input aria-label="Appointment date *" required type="date" min={businessToday()} value={date} onChange={event => setDate(event.target.value)} disabled={busy} /></label>
            <label className="space-y-1.5 text-sm font-medium">Requested start time *<Input aria-label="Requested start time *" required type="time" value={time} onChange={event => setTime(event.target.value)} disabled={busy} /></label>
            <label className="space-y-1.5 text-sm font-medium">Requested end time *<Input aria-label="Requested end time *" required type="time" value={endTime} min={time} onChange={event => setEndTime(event.target.value)} disabled={busy} /></label>
          </div>
          {endTime <= time && <p role="alert" className="text-xs text-danger">Choose an end time later than the start time.</p>}
        </section>
        <section aria-labelledby="group-heading" className={cn('rounded-2xl border p-4 sm:p-5', gender === 'FEMALE' ? 'border-purple-200 bg-purple-50/50' : 'border-blue-200/70 bg-blue-50/50')}>
          <div className="mb-4 flex items-center gap-2"><Users className="size-4" /><h4 id="group-heading" className="text-sm font-bold">02 <span className="ml-2">Student group</span></h4></div>
          <div className="grid items-end gap-5 sm:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1.5 text-sm font-medium">Group gender *<SelectInput aria-label="Group gender *" required value={gender} disabled={busy} className="w-full bg-surface" onChange={event => { setGender(event.target.value as typeof gender); setSelected([]); setSearch(''); }}><option value="" disabled>Select gender</option><option value="MALE">Male students</option><option value="FEMALE">Female students</option></SelectInput></label>
            <div className="space-y-1.5"><label htmlFor="student-count" className="text-sm font-medium">Number of students *</label><div className="flex h-11 items-center gap-1 rounded-lg border border-border bg-surface px-1"><button type="button" aria-label="Decrease student count" disabled={busy || quantity <= 1} onClick={() => changeCount(-1)} className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted disabled:opacity-35"><Minus className="size-4" /></button><Input id="student-count" aria-label="Number of students *" required type="number" min={1} max={10000} step={1} value={count} placeholder="0" onChange={event => setCount(event.target.value)} disabled={busy} className="h-9 border-0 px-0 text-center text-lg font-semibold shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" /><button type="button" aria-label="Increase student count" disabled={busy || quantity >= 10000} onClick={() => changeCount(1)} className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted disabled:opacity-35"><Plus className="size-4" /></button></div></div>
            <div className="flex items-center gap-3 rounded-xl bg-surface/80 px-5 py-2.5"><Users className="size-5 text-text-secondary" /><div><p className="text-[11px] text-text-secondary">Total students</p><p className="text-xl font-bold tabular-nums">{validCount ? quantity.toLocaleString() : '—'}</p></div></div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-text-secondary"><Info className="mt-0.5 size-3.5 shrink-0" />Book male and female groups separately. Every selected service applies to all students in this group.</p>
        </section>
        <section aria-labelledby="services-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h4 id="services-heading" className="text-sm font-bold">03 <span className="ml-2">Choose services</span></h4><span className="rounded-full bg-muted px-3 py-1 text-xs text-text-secondary">{selected.length} / 20 selected</span></div>
          {gender && <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-text-secondary" /><Input aria-label="Search available services" placeholder="Find a service for this group…" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" disabled={busy} /></div>}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
            {!gender ? <div className="flex flex-col items-center gap-2 p-8 text-center text-text-secondary"><Users className="size-6" /><p className="text-sm">Select the group gender to explore services.</p></div> : services.isLoading || services.isFetching ? <p role="status" className="p-5 text-sm text-text-secondary">Loading services…</p> : services.isError ? <div role="alert" className="p-5 text-sm">Services could not be loaded. <button type="button" className="underline" onClick={() => void services.refetch()}>Retry</button></div> : !available.length ? <p className="p-5 text-sm text-text-secondary">{search ? 'No services match your search.' : 'No active services are assigned to this gender at this location.'}</p> : available.map(service => {
              const checked = selected.some(item => item.id === service.id);
              return <label key={service.id} className={cn('flex cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-muted/40', checked && 'bg-champagne-light/30')}><input type="checkbox" className="size-4 accent-[var(--bv-champagne)]" checked={checked} disabled={busy || (!checked && selected.length >= 20)} onChange={event => setSelected(items => event.target.checked ? [...items, { id: service.id, name: service.name, price: service.price, gender: service.gender }] : items.filter(item => item.id !== service.id))} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{service.name}</span><span className="text-xs text-text-secondary">{service.durationMinutes} min per student</span></span><span className="text-right text-sm font-semibold">{formatCurrency(service.price)}<span className="block text-[11px] font-normal text-text-secondary">per student</span></span></label>;
            })}
          </div>
          {selected.length > 0 && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[480px] text-left text-sm"><thead className={gender === 'FEMALE' ? 'bg-purple-50' : 'bg-blue-50'}><tr><th className="px-4 py-3 font-semibold">Selected services</th><th className="px-3 py-3 text-right text-xs font-medium">Per student</th><th className="px-3 py-3 text-right text-xs font-medium">Students</th><th className="px-3 py-3 text-right text-xs font-medium">Estimate</th><th className="w-10"><span className="sr-only">Remove</span></th></tr></thead><tbody>{selected.map(service => <tr key={service.id} className="border-t border-border/60"><td className="px-4 py-3 font-medium">{service.name}</td><td className="px-3 py-3 text-right">{formatCurrency(service.price)}</td><td className="px-3 py-3 text-right tabular-nums">{validCount ? quantity : '—'}</td><td className="px-3 py-3 text-right font-semibold">{formatCurrency(validCount ? Number(service.price) * quantity : 0)}</td><td className="pr-3"><button type="button" aria-label={`Remove ${service.name}`} disabled={busy} onClick={() => setSelected(items => items.filter(item => item.id !== service.id))} className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-danger"><Trash2 className="size-4" /></button></td></tr>)}</tbody></table></div>}
        </section>
        <section aria-labelledby="contact-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 id="contact-heading" className="text-sm font-bold">04 <span className="ml-2">Institute contact</span></h4><span className="flex items-center gap-1.5 text-xs text-emerald"><ShieldCheck className="size-3.5" />No student personal details</span></div>
          <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1.5 text-sm font-medium">Contact name *<Input aria-label="Contact name *" required maxLength={150} value={contactName} onChange={event => setContactName(event.target.value)} disabled={busy} /></label><label className="space-y-1.5 text-sm font-medium">Contact phone *<Input aria-label="Contact phone *" required type="tel" value={contactPhone} onChange={event => setContactPhone(event.target.value)} disabled={busy} /></label><label className="space-y-1.5 text-sm font-medium">Contact role<SelectInput aria-label="Contact role" value={contactRole} onChange={event => setContactRole(event.target.value as typeof contactRole)} disabled={busy} className="w-full"><option value="Warden">Warden</option><option value="Assistant manager">Assistant manager</option></SelectInput></label></div>
          <label className="block space-y-1.5 text-sm font-medium">Notes <span className="font-normal text-text-secondary">(optional)</span><textarea className="w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-champagne" rows={2} placeholder="Arrival instructions, accessibility needs, or anything the team should know…" maxLength={1000} value={comments} onChange={event => setComments(event.target.value)} disabled={busy} /></label>
        </section>
      </div>
      <div className="sticky bottom-0 space-y-3 border-t border-border bg-surface px-5 py-4 sm:px-8">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-5 sm:gap-8"><div className="flex items-center gap-2.5"><Users className="size-5 text-text-secondary" /><div><p className="text-[11px] text-text-secondary">Students</p><p className="text-lg font-bold">{validCount ? quantity : '—'}</p></div></div><div className="flex items-center gap-2.5 border-l border-border pl-5"><Wallet className="size-5 text-emerald" /><div><p className="text-[11px] text-text-secondary">Estimated service total</p><p aria-live="polite" className="text-lg font-bold text-emerald">{formatCurrency(estimate)}</p></div></div></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={!valid || busy} className="flex-1 sm:flex-none">{busy ? 'Saving booking…' : 'Book appointment and notify team'}<ArrowRight className="size-4" /></Button></div></div>
        <p className="text-[11px] text-text-secondary">Estimate excludes taxes and discounts. Final prices are confirmed on the manager’s invoice.</p>
      </div>
    </form>}
  </Modal>;
}
