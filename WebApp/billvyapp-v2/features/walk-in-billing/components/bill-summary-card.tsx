'use client';

import { formatCurrency } from '@/lib/format';
import type { BillPreview } from '../types/walk-in-billing.types';

type BillSummaryCardProps = {
  preview: BillPreview;
};

export function BillSummaryCard({ preview }: BillSummaryCardProps) {
  return (
    <section className="app-surface-card p-5">
      <h2 className="mb-4 text-base font-semibold text-text">Bill Summary</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">
            Subtotal ({preview.itemCount}{' '}
            {preview.itemCount === 1 ? 'Item' : 'Items'})
          </dt>
          <dd className="font-medium tabular-nums text-text">
            {formatCurrency(preview.subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Discount</dt>
          <dd className="font-medium tabular-nums text-emerald">
            {preview.discount > 0
              ? `-${formatCurrency(preview.discount)}`
              : formatCurrency(0)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Tax (GST)</dt>
          <dd className="font-medium tabular-nums text-text">
            {formatCurrency(preview.tax)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <dt className="text-base font-semibold text-text">Total Amount</dt>
          <dd className="text-xl font-bold tabular-nums text-text">
            {formatCurrency(preview.total)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">You Save</dt>
          <dd className="font-semibold tabular-nums text-emerald">
            {formatCurrency(preview.youSave)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
