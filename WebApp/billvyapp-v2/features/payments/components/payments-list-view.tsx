'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { DataTable, type Column } from '@/components/data/data-table';
import { PageHeading, SelectInput } from '@/components/data/form-fields';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { BillRecordDialog } from '@/features/bills/components/bill-record-dialog';
import { listSalons } from '@/features/salons/services/salons.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { can } from '@/lib/capabilities';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/models';
import {
  countPayments,
  listPayments,
  PAYMENT_METHOD_LABELS,
  PAYMENT_NEXT_STATUSES,
  PAYMENT_STATUS_LABELS,
  updatePaymentStatus,
  type PaymentQuery,
} from '../services/payments.service';

const PAGE_SIZE = 15;

const TONE: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
};

type CountFilter = Omit<PaymentQuery, 'page' | 'limit'>;

function CountCard({ label, filter }: { label: string; filter: CountFilter }) {
  const count = useScopedQuery(['payments', 'count', filter], () => countPayments(filter), {
    capability: 'payments.read',
  });
  return (
    <div className="app-surface-card p-4">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text">
        {count.isLoading ? '…' : count.isError ? '—' : formatNumber(count.data)}
      </p>
    </div>
  );
}

export function PaymentsListView() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [billId, setBillId] = useState<string | null>(null);
  const canChangeStatus = can(user, 'payments.status');

  const range: CountFilter = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const query: PaymentQuery = {
    ...range,
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    paymentMethod: method || undefined,
  };

  const payments = useScopedQuery(['payments', 'list', query], () => listPayments(query), {
    capability: 'payments.read',
  });
  const salons = useScopedQuery(
    ['salons', 'name-map'],
    () => listSalons({ page: 1, limit: 100 }),
    { capability: 'salons.read', staleTime: 5 * 60_000 },
  );
  const salonName = (id: string) => salons.data?.data.find((s) => s.id === id)?.name ?? '—';

  const transition = useMutation<Payment, ApiError, { id: string; status: PaymentStatus }>({
    mutationFn: ({ id, status: next }) => updatePaymentStatus(id, next),
    onSuccess: (p) => {
      toast.success(`Payment marked ${PAYMENT_STATUS_LABELS[p.status].toLowerCase()}`);
      void invalidateAfter(queryClient, 'payments');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const columns: Column<Payment>[] = [
    {
      id: 'ref',
      header: 'Payment',
      cell: (p) => (
        <div>
          <p className="font-semibold">{p.transactionReference ?? 'No reference'}</p>
          <p className="text-xs text-text-secondary">{formatDateTime(p.paymentDate)}</p>
        </div>
      ),
    },
    { id: 'salon', header: 'Salon', cell: (p) => salonName(p.salonId) },
    { id: 'method', header: 'Method', cell: (p) => PAYMENT_METHOD_LABELS[p.paymentMethod] },
    { id: 'amount', header: 'Amount', cell: (p) => formatCurrency(p.amount) },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => <StatusBadge tone={TONE[p.status]} label={PAYMENT_STATUS_LABELS[p.status]} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (p) => {
        const next = canChangeStatus ? PAYMENT_NEXT_STATUSES[p.status] : [];
        if (next.length === 0) return null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <SelectInput
              aria-label="Change payment status"
              value=""
              className="w-36"
              disabled={transition.isPending && transition.variables?.id === p.id}
              onChange={(e) => {
                const s = e.target.value as PaymentStatus;
                if (!s) return;
                if (!window.confirm(`Mark this payment ${PAYMENT_STATUS_LABELS[s].toLowerCase()}?`)) return;
                transition.mutate({ id: p.id, status: s });
              }}
            >
              <option value="">Update…</option>
              {next.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectInput>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeading
        title="Payments"
        description="Payment records in your scope. Select a payment to open its bill."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard label="All payments" filter={range} />
        <CountCard label="Successful" filter={{ ...range, status: 'SUCCESS' }} />
        <CountCard label="Pending" filter={{ ...range, status: 'PENDING' }} />
        <CountCard label="Failed" filter={{ ...range, status: 'FAILED' }} />
      </div>
      <p className="text-[11px] text-text-secondary">
        Collected amount totals need a backend report endpoint and are not shown.
      </p>
      <DataTable
        columns={columns}
        query={payments}
        rowKey={(p) => p.id}
        onPageChange={setPage}
        onRowClick={(p) => setBillId(p.billId)}
        noun="payments"
        emptyTitle="No payments"
        emptyMessage="No payments match these filters."
        toolbar={
          <>
            <SelectInput
              aria-label="Payment status"
              value={status}
              onChange={(e) => resetPage(setStatus)(e.target.value as PaymentStatus | '')}
              className="w-36"
            >
              <option value="">All statuses</option>
              {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              aria-label="Payment method"
              value={method}
              onChange={(e) => resetPage(setMethod)(e.target.value as PaymentMethod | '')}
              className="w-36"
            >
              <option value="">All methods</option>
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </SelectInput>
            <Input
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => resetPage(setDateFrom)(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              aria-label="To date"
              value={dateTo}
              onChange={(e) => resetPage(setDateTo)(e.target.value)}
              className="w-40"
            />
          </>
        }
      />
      <BillRecordDialog billId={billId} onClose={() => setBillId(null)} />
    </div>
  );
}
