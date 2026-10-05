'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { DataTable, type Column } from '@/components/data/data-table';
import { FormField, MutationError, PageHeading, SelectInput } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { SalonPicker } from '@/features/salons/components/salon-picker';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { can } from '@/lib/capabilities';
import { businessToday } from '@/lib/business-calendar';
import { formatCurrency, formatDate } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { Product, Purchase, PurchaseStatus } from '@/types/models';
import {
  createPurchase,
  listPurchases,
  listVendors,
  PURCHASE_NEXT_STATUSES,
  searchProducts,
  updatePurchaseStatus,
  type PurchaseQuery,
} from '../services/procurement.service';

const PAGE_SIZE = 15;

const STATUS_TONE: Record<PurchaseStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  ORDERED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  PARTIALLY_RECEIVED: 'Partially received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

type Line = { product: Product; quantity: string; unitCost: string };

function CreatePurchaseDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [salonId, setSalonId] = useState(user?.salonId ?? '');
  const [vendorId, setVendorId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(businessToday());
  const [invoice, setInvoice] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const debouncedProduct = useDebouncedValue(productSearch);

  const vendors = useScopedQuery(
    ['vendors', 'picker'],
    () => listVendors({ page: 1, limit: 100, isActive: true }),
    { capability: 'vendors.read' },
  );
  const products = useScopedQuery(
    ['products', 'purchase-picker', salonId, debouncedProduct],
    () => searchProducts(salonId, debouncedProduct),
    { enabled: Boolean(salonId) },
  );

  const create = useMutation<Purchase, ApiError, void>({
    mutationFn: () =>
      createPurchase({
        salonId,
        vendorId,
        purchaseDate,
        vendorInvoiceNumber: invoice.trim() || null,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
      }),
    onSuccess: (p) => {
      toast.success(`Purchase ${p.purchaseNumber} created as draft`);
      void invalidateAfter(queryClient, 'purchases');
      onClose();
    },
  });

  const linesValid =
    lines.length > 0 &&
    lines.every((l) => Number(l.quantity) > 0 && Number(l.unitCost) >= 0 && l.unitCost !== '');
  const valid = Boolean(salonId && vendorId && purchaseDate) && linesValid;

  return (
    <Modal
      open
      onClose={onClose}
      busy={create.isPending}
      title="New purchase"
      description="Created as a draft. Stock is added only when the purchase is marked received."
      className="max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) create.mutate();
        }}
      >
        <div className="grid gap-3 panel-md:grid-cols-2">
          {!user?.salonId ? (
            <FormField id="purchase-salon" label="Salon">
              <SalonPicker
                id="purchase-salon"
                value={salonId}
                onChange={(id) => {
                  setSalonId(id);
                  setLines([]);
                }}
              />
            </FormField>
          ) : null}
          <FormField id="purchase-vendor" label="Vendor">
            <SelectInput id="purchase-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">{vendors.isLoading ? 'Loading…' : 'Select vendor'}</option>
              {(vendors.data?.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField id="purchase-date" label="Purchase date">
            <Input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </FormField>
          <FormField id="purchase-invoice" label="Vendor invoice no. (optional)">
            <Input id="purchase-invoice" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </FormField>
        </div>

        <div className="space-y-2">
          <FormField id="purchase-product" label="Add product">
            <Input
              id="purchase-product"
              placeholder={salonId ? 'Search products by name or SKU' : 'Select a salon first'}
              disabled={!salonId}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </FormField>
          {salonId && debouncedProduct ? (
            <ul className="max-h-36 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(products.data?.data ?? [])
                .filter((p) => !lines.some((l) => l.product.id === p.id))
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ivory"
                      onClick={() => {
                        setLines((prev) => [
                          ...prev,
                          { product: p, quantity: '1', unitCost: String(Number(p.costPrice) || '') },
                        ]);
                        setProductSearch('');
                      }}
                    >
                      <span>
                        {p.name} <span className="text-xs text-text-secondary">{p.sku}</span>
                      </span>
                      <span className="text-xs text-champagne">Add</span>
                    </button>
                  </li>
                ))}
              {products.data && products.data.data.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-secondary">No products found.</li>
              ) : null}
            </ul>
          ) : null}

          {lines.length > 0 ? (
            <div tabIndex={0} role="region" aria-label="Scrollable items" className="app-table-scroll"><table className="w-full text-sm">
              <thead className="text-xs text-text-secondary">
                <tr>
                  <th className="py-1 text-left font-medium">Product</th>
                  <th className="w-24 py-1 text-left font-medium">Qty</th>
                  <th className="w-32 py-1 text-left font-medium">Unit cost</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.product.id}>
                    <td className="py-1 pr-2">{l.product.name}</td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Quantity of ${l.product.name}`}
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Unit cost of ${l.product.name}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.unitCost}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="py-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${l.product.name}`}
                        onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <p className="text-xs text-text-secondary">No lines yet. Totals are calculated by the server.</p>
          )}
        </div>

        <FormField id="purchase-notes" label="Notes (optional)">
          <Input id="purchase-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        <MutationError error={create.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PurchaseDetail({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={purchase.purchaseNumber}
      description={`${formatDate(purchase.purchaseDate)} · ${STATUS_LABEL[purchase.status]}`}
      className="max-w-2xl"
    >
      <div tabIndex={0} role="region" aria-label="Scrollable items" className="app-table-scroll"><table className="w-full text-sm">
        <thead className="text-xs text-text-secondary">
          <tr>
            <th className="py-1 text-left font-medium">Product</th>
            <th className="py-1 text-right font-medium">Qty</th>
            <th className="py-1 text-right font-medium">Unit cost</th>
            <th className="py-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {purchase.items.map((item) => (
            <tr key={item.id}>
              <td className="py-1.5">{item.productName}</td>
              <td className="py-1.5 text-right">{item.quantity}</td>
              <td className="py-1.5 text-right">{formatCurrency(Number(item.unitCost))}</td>
              <td className="py-1.5 text-right">{formatCurrency(Number(item.total))}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-1 text-sm">
        <dt className="text-text-secondary">Subtotal</dt>
        <dd className="text-right">{formatCurrency(Number(purchase.subtotal))}</dd>
        <dt className="text-text-secondary">Discount</dt>
        <dd className="text-right">{formatCurrency(Number(purchase.discount))}</dd>
        <dt className="text-text-secondary">Tax</dt>
        <dd className="text-right">{formatCurrency(Number(purchase.tax))}</dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-semibold">{formatCurrency(Number(purchase.total))}</dd>
      </dl>
      {purchase.notes ? <p className="mt-3 text-sm text-text-secondary">{purchase.notes}</p> : null}
    </Modal>
  );
}

export function PurchasesView() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [salonId, setSalonId] = useState('');
  const [status, setStatus] = useState<PurchaseStatus | ''>('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const debounced = useDebouncedValue(search);
  const canManage = can(user, 'purchases.manage');

  const query: PurchaseQuery = {
    page,
    limit: PAGE_SIZE,
    salonId: user?.salonId ? undefined : salonId,
    status: status || undefined,
    search: debounced,
  };
  const purchases = useScopedQuery(['purchases', query], () => listPurchases(query), {
    capability: 'purchases.manage',
  });

  const transition = useMutation<Purchase, ApiError, { id: string; status: PurchaseStatus }>({
    mutationFn: ({ id, status: next }) => updatePurchaseStatus(id, next),
    onSuccess: (p) => {
      toast.success(
        p.status === 'RECEIVED'
          ? `${p.purchaseNumber} received — stock updated`
          : `${p.purchaseNumber} is now ${STATUS_LABEL[p.status].toLowerCase()}`,
      );
      void invalidateAfter(queryClient, 'purchases');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  const columns: Column<Purchase>[] = [
    {
      id: 'number',
      header: 'Purchase',
      cell: (p) => (
        <div>
          <p className="font-semibold">{p.purchaseNumber}</p>
          <p className="text-xs text-text-secondary">{p.vendorInvoiceNumber ?? 'No invoice no.'}</p>
        </div>
      ),
    },
    { id: 'date', header: 'Date', cell: (p) => formatDate(p.purchaseDate) },
    { id: 'items', header: 'Lines', cell: (p) => p.items.length },
    { id: 'total', header: 'Total', cell: (p) => formatCurrency(Number(p.total)) },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => <StatusBadge tone={STATUS_TONE[p.status]} label={STATUS_LABEL[p.status]} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (p) => {
        const next = canManage ? PURCHASE_NEXT_STATUSES[p.status] : [];
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {next.length > 0 ? (
              <SelectInput
                aria-label={`Change status of ${p.purchaseNumber}`}
                value=""
                className="w-40"
                disabled={transition.isPending && transition.variables?.id === p.id}
                onChange={(e) => {
                  const s = e.target.value as PurchaseStatus;
                  if (!s) return;
                  if (s === 'RECEIVED' && !window.confirm('Mark as received and add stock?')) return;
                  transition.mutate({ id: p.id, status: s });
                }}
              >
                <option value="">Update…</option>
                {next.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectInput>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeading
        title="Purchases"
        description="Purchase orders from vendors. Receiving a purchase posts stock to inventory."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New purchase
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        query={purchases}
        rowKey={(p) => p.id}
        onPageChange={setPage}
        onRowClick={setViewing}
        noun="purchases"
        emptyTitle="No purchases"
        emptyMessage="No purchase orders match these filters."
        toolbar={
          <>
            <Input
              aria-label="Search purchases"
              placeholder="Purchase or invoice no."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-56"
            />
            <SalonPicker
              allowAll
              value={salonId}
              onChange={(id) => {
                setSalonId(id);
                setPage(1);
              }}
              className="w-48"
            />
            <SelectInput
              aria-label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PurchaseStatus | '');
                setPage(1);
              }}
              className="w-44"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as PurchaseStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </SelectInput>
          </>
        }
      />
      {creating ? <CreatePurchaseDialog onClose={() => setCreating(false)} /> : null}
      {viewing ? <PurchaseDetail purchase={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
