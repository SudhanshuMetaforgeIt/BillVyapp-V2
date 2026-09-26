'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { FormField, MutationError, SelectInput } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { QueryErrorState } from '@/components/data/query-error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { can } from '@/lib/capabilities';
import { formatCurrency, formatDate, formatDateTime, formatFullName } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { Bill, BillStatus, Payment, PaymentMethod } from '@/types/models';
import {
  BILL_NEXT_STATUSES,
  changeBillStatus,
  getBill,
  recordCounterPayment,
} from '../services/bill-records.service';
import { BillDocumentsPanel } from './bill-documents-panel';
import { billStatusTone, paymentStatusTone } from './bill-tones';

const METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];

export function BillRecordDialog({ billId, onClose }: { billId: string | null; onClose: () => void }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const bill = useScopedQuery(['bills', 'detail', billId], () => getBill(billId as string), {
    enabled: Boolean(billId),
    placeholderData: undefined,
  });

  const status = useMutation<Bill, ApiError, BillStatus>({
    mutationFn: (next) => changeBillStatus(billId as string, next),
    onSuccess: (updated) => {
      toast.success(`Bill ${updated.billNumber} is now ${updated.status.toLowerCase()}`);
      void invalidateAfter(queryClient, 'bills');
    },
  });

  const b = bill.data;
  const nextStatuses = b && can(user, 'bills.status') ? BILL_NEXT_STATUSES[b.status] : [];
  const canRecordPayment =
    b && can(user, 'bills.write') && b.status === 'COMPLETED' && Number(b.dueAmount) > 0;

  return (
    <Modal
      open={Boolean(billId)}
      onClose={onClose}
      title={b ? `Bill ${b.billNumber}` : 'Bill'}
      description={b ? `${b.salon?.name ?? 'Salon'} · ${formatDate(b.billDate)}` : undefined}
      className="max-w-2xl"
    >
      {bill.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : bill.isError || !b ? (
        <QueryErrorState error={bill.error} onRetry={() => void bill.refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={b.status} tone={billStatusTone(b.status)} />
            <StatusBadge label={b.paymentStatus} tone={paymentStatusTone(b.paymentStatus)} />
            <span className="text-xs text-text-secondary">
              {b.customer ? formatFullName(b.customer) : 'Customer'}
              {b.customer?.phone ? ` · ${b.customer.phone}` : ''}
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="text-text-secondary">
              <tr>
                <th className="py-1 font-medium">Item</th>
                <th className="py-1 text-right font-medium">Qty</th>
                <th className="py-1 text-right font-medium">Rate</th>
                <th className="py-1 text-right font-medium">Tax</th>
                <th className="py-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5">{item.description ?? item.itemType}</td>
                  <td className="py-1.5 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-1.5 text-right">{formatCurrency(item.taxAmount)}</td>
                  <td className="py-1.5 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-xs">
            <dt className="text-text-secondary">Subtotal</dt>
            <dd className="text-right">{formatCurrency(b.subtotal)}</dd>
            <dt className="text-text-secondary">Discount</dt>
            <dd className="text-right">{formatCurrency(b.discount)}</dd>
            <dt className="text-text-secondary">Tax</dt>
            <dd className="text-right">{formatCurrency(b.tax)}</dd>
            <dt className="text-text-secondary">Round off</dt>
            <dd className="text-right">{formatCurrency(b.roundOff)}</dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">{formatCurrency(b.total)}</dd>
            <dt className="text-text-secondary">Paid</dt>
            <dd className="text-right">{formatCurrency(b.paidAmount)}</dd>
            <dt className="text-text-secondary">Due</dt>
            <dd className="text-right font-semibold">{formatCurrency(b.dueAmount)}</dd>
          </dl>

          <section className="space-y-2">
            <h4 className="text-xs font-bold text-text">Payments</h4>
            {b.payments.length === 0 ? (
              <p className="text-xs text-text-secondary">No payments recorded.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border text-xs">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2">
                    <span>
                      {p.paymentMethod} · {formatDateTime(p.paymentDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge label={p.status} tone={p.status === 'SUCCESS' ? 'success' : 'neutral'} />
                      {formatCurrency(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canRecordPayment ? <CounterPaymentForm bill={b} /> : null}
            {b.status === 'DRAFT' && can(user, 'bills.write') ? (
              <p className="text-[11px] text-text-secondary">
                Payments can be recorded once a manager completes this bill.
              </p>
            ) : null}
          </section>

          <BillDocumentsPanel billId={b.id} salonId={b.salonId} />

          {nextStatuses.length > 0 ? (
            <section className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-bold text-text">Change status</h4>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((next) => (
                  <Button
                    key={next}
                    type="button"
                    size="sm"
                    variant={next === 'COMPLETED' ? 'default' : 'outline'}
                    disabled={status.isPending}
                    onClick={() => {
                      if (next !== 'COMPLETED' && !window.confirm(`Mark this bill ${next.toLowerCase()}?`)) return;
                      status.mutate(next);
                    }}
                  >
                    {next === 'COMPLETED' ? 'Complete bill' : `Mark ${next.toLowerCase()}`}
                  </Button>
                ))}
              </div>
              <MutationError error={status.error} />
            </section>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

function CounterPaymentForm({ bill }: { bill: Bill }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(Number(bill.dueAmount)));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');

  const record = useMutation<Payment, ApiError, void>({
    mutationFn: () =>
      recordCounterPayment({
        billId: bill.id,
        amount: Number(amount),
        paymentMethod: method,
        transactionReference: reference.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Payment recorded');
      void invalidateAfter(queryClient, 'payments');
    },
  });

  const numeric = Number(amount);
  const valid = Number.isFinite(numeric) && numeric > 0;

  return (
    <form
      className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) record.mutate();
      }}
    >
      <FormField id="pay-amount" label="Amount received">
        <Input
          id="pay-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>
      <FormField id="pay-method" label="Method">
        <SelectInput
          id="pay-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m.replace('_', ' ')}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <FormField id="pay-ref" label="Reference (optional)">
        <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
      </FormField>
      <div className="sm:col-span-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-secondary">
          Only record money already collected at the counter.
        </p>
        <Button type="submit" size="sm" disabled={!valid || record.isPending}>
          {record.isPending ? 'Recording…' : 'Record payment received'}
        </Button>
      </div>
      <div className="sm:col-span-3">
        <MutationError error={record.error} />
      </div>
    </form>
  );
}
