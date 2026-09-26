'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DataTable, type Column } from '@/components/data/data-table';
import { PageHeading, SelectInput } from '@/components/data/form-fields';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { SalonPicker } from '@/features/salons/components/salon-picker';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { can } from '@/lib/capabilities';
import { formatCurrency, formatDate, formatFullName, formatNumber } from '@/lib/format';
import type { Bill, BillPaymentStatus, BillStatus } from '@/types/models';
import { countBills, listBills, type BillQuery } from '../services/bill-records.service';
import { BillRecordDialog } from './bill-record-dialog';
import { billStatusTone, paymentStatusTone } from './bill-tones';

const PAGE_SIZE = 15;
const STATUSES: BillStatus[] = ['DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
const PAYMENT_STATUSES: BillPaymentStatus[] = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'];

type CountFilter = Omit<BillQuery, 'page' | 'limit'>;

function CountCard({ label, filter, hint }: { label: string; filter: CountFilter; hint?: string }) {
  const count = useScopedQuery(['bills', 'count', filter], () => countBills(filter), {
    capability: 'bills.read',
  });
  return (
    <div className="app-surface-card p-4">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text">
        {count.isLoading ? '…' : count.isError ? '—' : formatNumber(count.data)}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-text-secondary">{hint}</p> : null}
    </div>
  );
}

export function BillsListView({ newBillHref }: { newBillHref?: string }) {
  const user = useCurrentUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [salonId, setSalonId] = useState('');
  const [status, setStatus] = useState<BillStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<BillPaymentStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const scopeFilter: CountFilter = {
    salonId: salonId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const query: BillQuery = {
    ...scopeFilter,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
  };

  const bills = useScopedQuery(['bills', 'list', query], () => listBills(query), {
    capability: 'bills.read',
  });

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const columns: Column<Bill>[] = [
    {
      id: 'number',
      header: 'Bill',
      cell: (b) => (
        <div>
          <p className="font-semibold">{b.billNumber}</p>
          <p className="text-xs text-text-secondary">{formatDate(b.billDate)}</p>
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (b) => (
        <div>
          <p>{b.customer ? formatFullName(b.customer) : '-'}</p>
          <p className="text-xs text-text-secondary">{b.customer?.phone ?? ''}</p>
        </div>
      ),
    },
    { id: 'salon', header: 'Salon', cell: (b) => b.salon?.name ?? '-' },
    { id: 'total', header: 'Total', cell: (b) => formatCurrency(b.total) },
    { id: 'due', header: 'Due', cell: (b) => formatCurrency(b.dueAmount) },
    {
      id: 'status',
      header: 'Status',
      cell: (b) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge label={b.status} tone={billStatusTone(b.status)} />
          <StatusBadge label={b.paymentStatus} tone={paymentStatusTone(b.paymentStatus)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeading
        title="Bills"
        description="Bills in your scope. Totals and dues are calculated by the server."
        actions={
          newBillHref && can(user, 'bills.write') ? (
            <Link href={newBillHref} className={buttonVariants()}>
              <Plus className="size-4" /> New bill
            </Link>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CountCard label="All bills" filter={scopeFilter} />
        <CountCard label="Drafts" filter={{ ...scopeFilter, status: 'DRAFT' }} hint="Awaiting completion" />
        <CountCard label="Paid" filter={{ ...scopeFilter, paymentStatus: 'PAID' }} />
        <CountCard label="Partially paid" filter={{ ...scopeFilter, paymentStatus: 'PARTIAL' }} />
        <CountCard
          label="Unpaid"
          filter={{ ...scopeFilter, status: 'COMPLETED', paymentStatus: 'UNPAID' }}
          hint="Completed with nothing collected"
        />
      </div>
      <p className="text-[11px] text-text-secondary">
        Revenue and outstanding amount totals need a backend report endpoint and are not shown.
      </p>

      <DataTable
        columns={columns}
        query={bills}
        rowKey={(b) => b.id}
        onPageChange={setPage}
        onRowClick={(b) => setViewing(b.id)}
        noun="bills"
        emptyTitle="No bills"
        emptyMessage="No bills match these filters."
        toolbar={
          <>
            <Input
              aria-label="Search bills"
              placeholder="Bill no., customer name or phone"
              value={search}
              onChange={(e) => resetPage(setSearch)(e.target.value)}
              className="w-60"
            />
            <SalonPicker allowAll value={salonId} onChange={resetPage(setSalonId)} className="w-48" />
            <SelectInput
              aria-label="Bill status"
              value={status}
              onChange={(e) => resetPage(setStatus)(e.target.value as BillStatus | '')}
              className="w-36"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              aria-label="Payment status"
              value={paymentStatus}
              onChange={(e) => resetPage(setPaymentStatus)(e.target.value as BillPaymentStatus | '')}
              className="w-36"
            >
              <option value="">All payments</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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

      <BillRecordDialog billId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
