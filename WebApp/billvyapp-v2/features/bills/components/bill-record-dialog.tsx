'use client';

import { getBusinessRegion } from '@/lib/business-region';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

import {
  FormField,
  MutationError,
  SelectInput,
} from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { QueryErrorState } from '@/components/data/query-error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { can } from '@/lib/capabilities';
import { createUuid } from '@/lib/uuid';
import { UpiPaymentDialog } from '@/features/walk-in-billing/components/upi-payment-dialog';
import { LoyaltyBillCredit } from '@/features/loyalty/components/loyalty-bill-credit';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFullName,
} from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { Bill, BillStatus, Payment, PaymentMethod } from '@/types/models';
import {
  BILL_NEXT_STATUSES,
  changeBillStatus,
  getBill,
  recordCounterPayment,
} from '../services/bill-records.service';
import { CouponCodeCard } from '@/features/walk-in-billing/components/coupon-code-card';
import type { ValidatedBillCoupon } from '@/features/walk-in-billing/types/walk-in-billing.types';
import { api } from '@/services/api-client';
import { BillDocumentsPanel } from './bill-documents-panel';
import { billStatusTone, paymentStatusTone } from './bill-tones';
import { billPaymentLabel, billReceiptSummary } from '../utils/bill-receipt-summary';

const METHODS: PaymentMethod[] = [
  'CASH',
  'UPI',
  'CARD',
  'BANK_TRANSFER',
  'WALLET',
  'OTHER',
];

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] ?? c,
  );
}

function downloadBillInvoice(bill: Bill) {
  const summary = billReceiptSummary(bill);
  const customerName = bill.customer
    ? formatFullName(bill.customer)
    : 'Customer';
  const rows = bill.items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.description ?? item.itemType)}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${formatCurrency(item.unitPrice, bill.currency)}</td>
          <td style="text-align:right">${formatCurrency(item.membershipDiscount ?? 0, bill.currency)}</td>
          <td style="text-align:right">${formatCurrency(item.taxAmount, bill.currency)}</td>
          <td style="text-align:right">${formatCurrency(item.total, bill.currency)}</td>
        </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Bill ${escapeHtml(bill.billNumber)}</title>
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#111}
  h1{font-size:20px;margin:0 0 4px}
  .meta{color:#555;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
  th{color:#555;font-weight:600}
  .totals{margin-top:16px;width:280px;margin-left:auto;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:3px 0}
  .totals .grand{font-weight:700;border-top:1px solid #111;margin-top:6px;padding-top:6px}
</style></head><body>
  <h1>Bill ${escapeHtml(bill.billNumber)}</h1>
  <div class="meta">
    ${escapeHtml(bill.salon?.name ?? 'Salon')} · ${formatDate(bill.billDate)}<br/>
    ${escapeHtml(customerName)}${bill.customer?.phone ? ` · ${escapeHtml(bill.customer.phone)}` : ''}<br/>
    Status: ${bill.status} · Payment: ${bill.paymentStatus}
    ${bill.enrolledCouponCode ? `<br/>New membership coupon: ${escapeHtml(bill.enrolledCouponCode)}` : ''}
    ${bill.couponCode ? `<br/>Membership coupon: ${escapeHtml(bill.couponCode)}` : ''}
  </div>
  <table>
    <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Membership discount</th><th style="text-align:right">Tax</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    ${summary.map((row) => `<div${row.emphasis ? ' class="grand"' : ''}><span>${escapeHtml(row.label)}</span><span>${formatCurrency(row.amount, bill.currency)}</span></div>`).join('')}
  </div>
  <h2 style="font-size:14px;clear:both;padding-top:16px">Payments</h2>
  <table><thead><tr><th>Method</th><th>Date</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead><tbody>
    ${bill.payments.map((payment) => `<tr><td>${escapeHtml(billPaymentLabel(payment))}</td><td>${formatDateTime(payment.paymentDate)}</td><td>${escapeHtml(payment.status)}</td><td style="text-align:right">${formatCurrency(payment.amount, bill.currency)}</td></tr>`).join('') || '<tr><td colspan="4">No payments recorded.</td></tr>'}
  </tbody></table>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bill.billNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function BillRecordDialog({
  billId,
  onClose,
}: {
  billId: string | null;
  onClose: () => void;
}) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const bill = useScopedQuery(
    ['bills', 'detail', billId],
    () => getBill(billId as string),
    {
      enabled: Boolean(billId),
      placeholderData: undefined,
    },
  );

  const status = useMutation<Bill, ApiError, BillStatus>({
    mutationFn: (next) => changeBillStatus(billId as string, next),
    onSuccess: (updated) => {
      toast.success(
        `Bill ${updated.billNumber} is now ${updated.status.toLowerCase()}`,
      );
      void invalidateAfter(queryClient, 'bills');
    },
  });

  const b = bill.data;
  const nextStatuses =
    b && can(user, 'bills.status') ? BILL_NEXT_STATUSES[b.status] : [];
  const canRecordPayment =
    b &&
    can(user, 'bills.write') &&
    b.status === 'COMPLETED' &&
    Number(b.dueAmount) > 0;

  return (
    <Modal
      open={Boolean(billId)}
      onClose={onClose}
      title={b ? `Bill ${b.billNumber}` : 'Bill'}
      description={
        b
          ? `${b.salon?.name ?? 'Salon'} · ${formatDate(b.billDate)}`
          : undefined
      }
      className="max-w-2xl"
    >
      {bill.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : bill.isError || !b ? (
        <QueryErrorState
          error={bill.error}
          onRetry={() => void bill.refetch()}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={b.status} tone={billStatusTone(b.status)} />
            <StatusBadge
              label={b.paymentStatus}
              tone={paymentStatusTone(b.paymentStatus)}
            />
            <span className="text-sm font-medium text-text">
              {b.customer ? formatFullName(b.customer) : 'Customer'}
              {b.customer?.phone ? (
                <span className="font-normal text-text-secondary">
                  {' '}
                  · {b.customer.phone}
                </span>
              ) : null}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={() => {
                downloadBillInvoice(b);
                toast.success('Opening bill for download / print');
              }}
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Scrollable items"
            className="app-table-scroll"
          >
            <table className="w-full text-left text-xs">
              <thead className="text-text-secondary">
                <tr>
                  <th className="py-1 font-medium">Item</th>
                  <th className="py-1 text-right font-medium">Qty</th>
                  <th className="py-1 text-right font-medium">Rate</th>
                  <th className="py-1 text-right font-medium">Membership discount</th>
                  <th className="py-1 text-right font-medium">Tax</th>
                  <th className="py-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {b.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5">
                      {item.description ?? item.itemType}
                    </td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right">
                      {formatCurrency(item.unitPrice, b.currency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatCurrency(item.membershipDiscount ?? 0, b.currency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatCurrency(item.taxAmount, b.currency)}
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {formatCurrency(item.total, b.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {b.enrolledCouponCode && (
            <p className="text-sm">
              New membership coupon:{' '}
              <span className="font-mono">{b.enrolledCouponCode}</span>
            </p>
          )}
          {b.couponCode && (
            <p className="text-sm">
              <span className="font-semibold">Membership coupon: </span>
              <span className="break-all font-mono">{b.couponCode}</span>
            </p>
          )}
          {b.status === 'DRAFT' && can(user, 'bills.write') && (
            <BillCouponEditor key={`${b.id}:${b.couponCode ?? ''}`} bill={b} />
          )}

          <dl className="ml-auto w-full max-w-sm space-y-2 text-sm">
            {billReceiptSummary(b).map((row) => (
              <div key={row.label} className={`flex justify-between gap-4 ${row.emphasis ? 'border-t border-border pt-2 font-semibold' : row.saving ? 'text-emerald' : 'text-text-secondary'}`}>
                <dt>{row.label}</dt>
                <dd className="text-right tabular-nums">{formatCurrency(row.amount, b.currency)}</dd>
              </div>
            ))}
          </dl>

          <section className="space-y-2">
            <h4 className="text-xs font-bold text-text">Payments</h4>
            {b.payments.length === 0 ? (
              <p className="text-xs text-text-secondary">
                No payments recorded.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border text-xs">
                {b.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span>
                      {billPaymentLabel(p)} · {formatDateTime(p.paymentDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        label={p.status}
                        tone={p.status === 'SUCCESS' ? 'success' : 'neutral'}
                      />
                      {formatCurrency(p.amount, b.currency)}
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
                      if (
                        next !== 'COMPLETED' &&
                        !window.confirm(`Mark this bill ${next.toLowerCase()}?`)
                      )
                        return;
                      status.mutate(next);
                    }}
                  >
                    {next === 'COMPLETED'
                      ? 'Complete bill'
                      : `Mark ${next.toLowerCase()}`}
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
  const [loyaltyPending, setLoyaltyPending] = useState(false);
  const [upiOpen, setUpiOpen] = useState(false);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(Number(bill.dueAmount)));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const paymentInput = useMemo(() => ({
    idempotencyKey: createUuid(),
    billId: bill.id,
    currency: bill.currency,
    amount: Number(amount),
    paymentMethod: method,
    transactionReference: reference.trim() || null,
  }), [bill.id, bill.currency, amount, method, reference]);

  const record = useMutation<Payment, ApiError, void>({
    mutationFn: () =>
      recordCounterPayment(paymentInput),
    onSuccess: () => {
      setAmount('');
      setReference('');
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
        if (valid && !loyaltyPending) record.mutate();
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
          {METHODS.filter(
            (method) =>
              method !== 'UPI' || getBusinessRegion().currency !== 'USD',
          ).map((m) => (
            <option key={m} value={m}>
              {m.replace('_', ' ')}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <FormField id="pay-ref" label="Reference (optional)">
        <Input
          id="pay-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </FormField>
      <div className="sm:col-span-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-secondary">
          Only record money already collected at the counter.
        </p>
        <Button type="submit" size="sm" disabled={!valid || record.isPending || loyaltyPending}>
          {record.isPending ? 'Recording…' : 'Record payment received'}
        </Button>
      </div>
      <div className="sm:col-span-3">
        <LoyaltyBillCredit billId={bill.id} salonId={bill.salonId} customerId={bill.customerId} dueAmount={bill.dueAmount} busy={record.isPending} onBusyChange={setLoyaltyPending} onApplied={() => { setAmount(''); void getBill(bill.id).then((updated) => setAmount(String(Number(updated.dueAmount)))).catch(() => toast.error('Points applied. Reload this bill to see the remaining balance.')); }} />
        {method === 'UPI' && <Button type="button" size="sm" disabled={record.isPending} onClick={() => setUpiOpen(true)}>Show UPI QR for balance due</Button>}
        {upiOpen && <UpiPaymentDialog bill={bill} onClose={() => setUpiOpen(false)} />}
        <MutationError error={record.error} />
      </div>
    </form>
  );
}

function BillCouponEditor({ bill }: { bill: Bill }) {
  const [coupon, setCoupon] = useState<ValidatedBillCoupon | null>(null);
  const client = useQueryClient();
  const save = useMutation<Bill, ApiError, string | null>({
    mutationFn: (couponCode) =>
      api.patch<Bill>(`/bills/${bill.id}`, { couponCode }),
    onSuccess: () => {
      toast.success('Bill coupon updated');
      void invalidateAfter(client, 'bills');
    },
  });
  return (
    <div className="space-y-2">
      <CouponCodeCard
        salonId={bill.salonId}
        customerId={bill.customerId}
        coupon={coupon}
        onChange={setCoupon}
        disabled={save.isPending}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!coupon || save.isPending}
          onClick={() => save.mutate(coupon?.couponCode ?? null)}
        >
          Save coupon on draft
        </Button>
        {bill.couponCode && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={save.isPending}
            onClick={() => save.mutate(null)}
          >
            Remove saved coupon
          </Button>
        )}
      </div>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {save.error.message}
        </p>
      )}
    </div>
  );
}
