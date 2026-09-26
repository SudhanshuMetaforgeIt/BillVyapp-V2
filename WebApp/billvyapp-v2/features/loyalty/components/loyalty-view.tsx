'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { DataTable, type Column } from '@/components/data/data-table';
import { FormField, MutationError, PageHeading, SelectInput } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomerSearch } from '@/features/walk-in-billing/hooks/use-customer-search';
import type { WalkInCustomer } from '@/features/walk-in-billing/types/walk-in-billing.types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { can } from '@/lib/capabilities';
import { formatDateTime, formatFullName, formatPhone } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/types/api.types';
import type { LoyaltyTransaction, LoyaltyTransactionType } from '@/types/models';
import {
  createLoyaltyTransaction,
  getLoyaltyBalance,
  listLoyalty,
  type LoyaltyQuery,
} from '../services/loyalty.service';

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<LoyaltyTransactionType, string> = {
  EARNED: 'Earned',
  REDEEMED: 'Redeemed',
  EXPIRED: 'Expired',
  ADJUSTED: 'Adjusted',
  BONUS: 'Bonus',
};

const COLUMNS: Column<LoyaltyTransaction>[] = [
  { id: 'when', header: 'When', cell: (t) => formatDateTime(t.createdAt) },
  { id: 'type', header: 'Type', cell: (t) => TYPE_LABEL[t.transactionType] },
  {
    id: 'points',
    header: 'Points',
    cell: (t) => (
      <span className={cn('font-semibold tabular-nums', t.points < 0 ? 'text-danger' : 'text-emerald')}>
        {t.points > 0 ? `+${t.points}` : t.points}
      </span>
    ),
  },
  { id: 'desc', header: 'Description', cell: (t) => t.description ?? '—' },
];

function CustomerLookup({
  selected,
  onSelect,
}: {
  selected: WalkInCustomer | null;
  onSelect: (c: WalkInCustomer | null) => void;
}) {
  const [q, setQ] = useState('');
  const search = useCustomerSearch(q);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-ivory-soft px-3 py-2">
        <div>
          <p className="text-sm font-semibold">{formatFullName(selected)}</p>
          <p className="text-xs text-text-secondary">{formatPhone(selected.phone)}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        aria-label="Find customer"
        placeholder="Find customer by phone or name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-72"
      />
      {q.trim().length >= 3 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {search.isLoading ? (
            <li className="px-3 py-2 text-sm text-text-secondary">Searching…</li>
          ) : (search.data?.data ?? []).length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-secondary">No customers found.</li>
          ) : (
            search.data?.data.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-ivory"
                  onClick={() => {
                    onSelect(c);
                    setQ('');
                  }}
                >
                  {formatFullName(c)} <span className="text-xs text-text-secondary">{formatPhone(c.phone)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function AdjustDialog({ customer, onClose }: { customer: WalkInCustomer; onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [type, setType] = useState<LoyaltyTransactionType>('BONUS');
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation<LoyaltyTransaction, ApiError, void>({
    mutationFn: () => {
      const raw = Math.trunc(Number(points));
      const value = Math.abs(raw);
      // Backend sign rules: REDEEMED/EXPIRED < 0, EARNED/BONUS > 0, ADJUSTED either.
      const signed =
        type === 'ADJUSTED' ? raw : type === 'REDEEMED' || type === 'EXPIRED' ? -value : value;
      return createLoyaltyTransaction({
        customerId: customer.id,
        salonId: user?.salonId ?? null,
        points: signed,
        transactionType: type,
        description: description.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success('Loyalty points recorded');
      void invalidateAfter(queryClient, 'loyalty');
      onClose();
    },
  });

  const numeric = Math.trunc(Number(points));
  const valid = type === 'ADJUSTED' ? Number.isFinite(numeric) && numeric !== 0 : numeric > 0;

  return (
    <Modal
      open
      onClose={onClose}
      busy={create.isPending}
      title={`Loyalty points — ${formatFullName(customer)}`}
      description="The balance is recalculated by the server."
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) create.mutate();
        }}
      >
        <FormField id="loyalty-type" label="Type">
          <SelectInput
            id="loyalty-type"
            value={type}
            onChange={(e) => setType(e.target.value as LoyaltyTransactionType)}
          >
            {(Object.keys(TYPE_LABEL) as LoyaltyTransactionType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField
          id="loyalty-points"
          label="Points"
          hint={type === 'ADJUSTED' ? 'Use a negative number to deduct.' : undefined}
        >
          <Input
            id="loyalty-points"
            type="number"
            min={type === 'ADJUSTED' ? undefined : 1}
            step={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </FormField>
        <FormField id="loyalty-desc" label="Description (optional)">
          <Input id="loyalty-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <MutationError error={create.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || create.isPending}>
            {create.isPending ? 'Saving…' : 'Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function LoyaltyView() {
  const user = useCurrentUser();
  const [page, setPage] = useState(1);
  const [customer, setCustomer] = useState<WalkInCustomer | null>(null);
  const [type, setType] = useState<LoyaltyTransactionType | ''>('');
  const [adjusting, setAdjusting] = useState(false);
  const canWrite = can(user, 'loyalty.write');

  const query: LoyaltyQuery = {
    page,
    limit: PAGE_SIZE,
    customerId: customer?.id,
    transactionType: type || undefined,
  };
  const transactions = useScopedQuery(['loyalty', query], () => listLoyalty(query), {
    capability: 'loyalty.read',
  });
  const balance = useScopedQuery(
    ['loyalty', 'balance', customer?.id],
    () => getLoyaltyBalance(customer?.id),
    { enabled: Boolean(customer), capability: 'loyalty.read' },
  );

  return (
    <div className="space-y-5">
      <PageHeading
        title="Loyalty"
        description="Points ledger across customers in your scope."
        actions={
          canWrite && customer ? (
            <Button type="button" onClick={() => setAdjusting(true)}>
              <Plus className="size-4" /> Record points
            </Button>
          ) : null
        }
      />

      {customer ? (
        <div className="app-surface-card flex items-center justify-between p-4">
          <p className="text-sm text-text-secondary">
            Current balance for <span className="font-semibold text-text">{formatFullName(customer)}</span>
          </p>
          <p className="text-2xl font-semibold tabular-nums text-text" aria-live="polite">
            {balance.isLoading ? '…' : balance.isError ? '—' : `${balance.data?.balance ?? 0} pts`}
          </p>
        </div>
      ) : null}

      <DataTable
        columns={COLUMNS}
        query={transactions}
        rowKey={(t) => t.id}
        onPageChange={setPage}
        noun="transactions"
        emptyTitle="No loyalty activity"
        emptyMessage={customer ? 'This customer has no loyalty transactions yet.' : 'No transactions match these filters.'}
        toolbar={
          <>
            <CustomerLookup
              selected={customer}
              onSelect={(c) => {
                setCustomer(c);
                setPage(1);
              }}
            />
            <SelectInput
              aria-label="Transaction type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as LoyaltyTransactionType | '');
                setPage(1);
              }}
              className="w-40"
            >
              <option value="">All types</option>
              {(Object.keys(TYPE_LABEL) as LoyaltyTransactionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </SelectInput>
          </>
        }
      />
      {adjusting && customer ? <AdjustDialog customer={customer} onClose={() => setAdjusting(false)} /> : null}
    </div>
  );
}
