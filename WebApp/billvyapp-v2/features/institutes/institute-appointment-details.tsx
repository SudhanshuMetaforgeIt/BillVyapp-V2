'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { api } from '@/services/api-client';
import { formatDate, formatCurrency } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import { BillRecordDialog } from '@/features/bills/components/bill-record-dialog';
import type { AppointmentApiItem } from '@/features/appointments/types/appointments.types';
import { createInstituteInvoice, retryInstituteEmails } from './institute.service';

export function InstituteAppointmentDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [billId, setBillId] = useState<string | null>(null);
  const query = useScopedQuery(['appointments', 'institute-detail', id], () => api.get<AppointmentApiItem>(`/appointments/${id}`), { placeholderData: undefined, staleTime: 0, refetchInterval: 10000 });
  const invoice = useMutation({ mutationFn: () => createInstituteInvoice(id), onSuccess: bill => { setBillId(bill.id); void invalidateAfter(queryClient, 'bills'); void query.refetch(); } });
  const retry = useMutation({ mutationFn: () => retryInstituteEmails(id), onSuccess: () => void query.refetch() });
  const appointment = query.data;
  const management = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
  const emails = appointment?.emailNotifications ?? [];
  const bookingEmailStatus = emails.length > 0 && emails.every(email => email.status === 'SENT')
    ? 'Sent'
    : emails.some(email => email.status === 'FAILED') ? 'Not sent'
    : emails.some(email => email.status === 'UNKNOWN') ? 'Unconfirmed'
    : 'Pending';
  return <>
    <Modal open={!billId} title={appointment?.appointmentNumber ?? 'Appointment details'} onClose={onClose} className="max-w-xl">
      {query.isLoading ? <p role="status">Loading booking…</p> : query.isError ? <p role="alert">Could not load the booking. <button onClick={() => void query.refetch()}>Retry</button></p> : appointment && <div className="space-y-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-secondary">Student group</dt><dd>{appointment.studentGender === 'MALE' ? 'Male' : 'Female'} · {appointment.studentCount} students</dd></div>
          <div><dt className="text-text-secondary">Status</dt><dd>{appointment.status.replaceAll('_', ' ')}</dd></div>
          <div><dt className="text-text-secondary">Date and service window</dt><dd>{formatDate(appointment.appointmentDate)} · {appointment.startTime.slice(0, 5)}–{appointment.endTime.slice(0, 5)}</dd></div>
          <div><dt className="text-text-secondary">Contact</dt><dd>{appointment.contactName} ({appointment.contactRole})<br />{appointment.contactPhone}</dd></div>
        </dl>
        <section><h3 className="text-sm font-semibold">Requested services</h3><ul className="divide-y divide-border">{appointment.services.map(line => <li key={line.id} className="flex justify-between gap-3 py-2 text-sm"><span>{line.name} × {appointment.studentCount}</span><span>{formatCurrency(line.price)} / student at booking</span></li>)}</ul></section>
        {appointment.notes && <p className="whitespace-pre-wrap text-sm">{appointment.notes}</p>}
        <section className="space-y-2"><h3 className="text-sm font-semibold">Booking emails</h3><p className="text-xs">{bookingEmailStatus}</p>
          {management && emails.some(email => email.status === 'FAILED') && <Button size="sm" disabled={retry.isPending} onClick={() => retry.mutate()}>Retry failed emails</Button>}
          {management && retry.error && <p role="alert" className="text-sm text-danger">{retry.error.message}</p>}
        </section>
        {management && appointment.status === 'COMPLETED' && <section className="space-y-2 border-t border-border pt-3">
          <p className="text-xs text-text-secondary">Review current prices, then issue the invoice. Each service quantity equals the booked student count.</p>
          <Button disabled={invoice.isPending} onClick={() => appointment.instituteInvoice ? setBillId(appointment.instituteInvoice.id) : invoice.mutate()}>{invoice.isPending ? 'Preparing invoice…' : appointment.instituteInvoice ? 'View invoice' : 'Generate invoice'}</Button>
          {invoice.error && <p role="alert" className="text-sm text-danger">{invoice.error.message}</p>}
        </section>}
        {!management && appointment.instituteInvoice?.status === 'COMPLETED' && <Button variant="outline" onClick={() => setBillId(appointment.instituteInvoice!.id)}>View invoice</Button>}
      </div>}
    </Modal>
    {billId && <BillRecordDialog billId={billId} readOnly={!management} onClose={() => { setBillId(null); void query.refetch(); }} />}
  </>;
}
