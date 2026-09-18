'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatFullName, formatPhone } from '@/lib/format';
import { useCustomerSearch } from '@/features/walk-in-billing/hooks/use-customer-search';
import { useSalonServices } from '@/features/walk-in-billing/hooks/use-service-catalog';
import { normalizeIndianPhone } from '@/features/walk-in-billing/lib/bill-preview';
import type { WalkInCustomer } from '@/features/walk-in-billing/types/walk-in-billing.types';
import { useCreateAppointment } from '../hooks/use-create-appointment';
import { useStaffOptions } from '../hooks/use-appointments';

type CreateAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAppointmentDialog({
  open,
  onOpenChange,
}: CreateAppointmentDialogProps) {
  const titleId = useId();
  const user = useCurrentUser();
  const salonId = user?.salonId ?? null;

  const [phoneQuery, setPhoneQuery] = useState('');
  const [customer, setCustomer] = useState<WalkInCustomer | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const search = useCustomerSearch(phoneQuery);
  const services = useSalonServices(open && Boolean(salonId), {
    search: '',
    categoryId: '',
  });
  const staff = useStaffOptions(open);
  const create = useCreateAppointment(() => {
    onOpenChange(false);
    reset();
  });

  function reset() {
    setPhoneQuery('');
    setCustomer(null);
    setServiceId('');
    setStaffId('');
    setAppointmentDate('');
    setStartTime('10:00');
    setNotes('');
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  const canSubmit = useMemo(
    () =>
      Boolean(salonId) &&
      Boolean(customer) &&
      Boolean(serviceId) &&
      Boolean(appointmentDate) &&
      Boolean(startTime) &&
      !create.isPending,
    [salonId, customer, serviceId, appointmentDate, startTime, create.isPending],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text">
              New Appointment
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Book a service for a customer at your salon.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {!salonId ? (
          <p className="text-sm text-danger">
            Your account needs a salon assignment to create appointments.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || !customer || !salonId) return;
              create.mutate({
                salonId,
                customerId: customer.id,
                staffId: staffId || null,
                appointmentDate,
                startTime,
                notes: notes.trim() || null,
                services: [
                  {
                    serviceId,
                    staffId: staffId || null,
                  },
                ],
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="appt-phone">Customer phone</Label>
              {customer ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-ivory-soft px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {formatFullName(customer)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatPhone(customer.phone)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomer(null);
                      setPhoneQuery('');
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="appt-phone"
                    value={phoneQuery}
                    onChange={(e) => setPhoneQuery(e.target.value)}
                    placeholder="Search by phone"
                    inputMode="tel"
                  />
                  {normalizeIndianPhone(phoneQuery).length >= 3 ? (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border">
                      {search.isLoading ? (
                        <p className="p-3 text-sm text-text-secondary">
                          Searching…
                        </p>
                      ) : (search.data?.data.length ?? 0) === 0 ? (
                        <p className="p-3 text-sm text-text-secondary">
                          No customer found. Create one from Walk-in Billing
                          first.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border/70">
                          {search.data?.data.map((row) => (
                            <li key={row.id}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-champagne-light/40"
                                onClick={() => setCustomer(row)}
                              >
                                <span>
                                  <span className="block font-medium text-text">
                                    {formatFullName(row)}
                                  </span>
                                  <span className="block text-xs text-text-secondary">
                                    {formatPhone(row.phone)}
                                  </span>
                                </span>
                                <span className="text-xs text-champagne">
                                  Select
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appt-service">Service</Label>
              <select
                id="appt-service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Select service</option>
                {(services.data?.data ?? []).map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appt-staff">Staff (optional)</Label>
              <select
                id="appt-staff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Any available</option>
                {(staff.data ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="appt-date">Date</Label>
                <Input
                  id="appt-date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appt-time">Start time</Label>
                <Input
                  id="appt-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appt-notes">Notes</Label>
              <Input
                id="appt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {create.isPending ? 'Booking…' : 'Book appointment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
