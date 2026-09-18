'use client';

import { MoreVertical, Package } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  InventoryListRow,
  PaginationMeta,
} from '../types/inventory.types';
import { InventoryPagination } from './inventory-pagination';

type InventoryTableProps = {
  rows: InventoryListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onAdjustRow: (row: InventoryListRow) => void;
};

function statusClass(status: InventoryListRow['stockStatus']): string {
  if (status === 'out') {
    return 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger';
  }
  if (status === 'low') {
    return 'bg-[color-mix(in_srgb,var(--bv-warning)_14%,white)] text-warning';
  }
  return 'bg-emerald-light text-emerald';
}

export function InventoryTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
  onAdjustRow,
}: InventoryTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load inventory. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No inventory items found"
          message="Add a product, then adjust stock to create an inventory row."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">On Hand</th>
                  <th className="px-4 py-3 font-semibold">Available</th>
                  <th className="px-4 py-3 font-semibold">Reorder At</th>
                  <th className="px-4 py-3 font-semibold">Avg Cost</th>
                  <th className="px-4 py-3 font-semibold">Last Stocked</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-0 hover:bg-ivory/50"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                          <Package className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text">
                            {row.productName}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            Reserved: {row.reservedQuantity}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-text">
                      {row.productSku}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.categoryLabel}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-text">
                      {row.quantityOnHand}
                    </td>
                    <td className="px-4 py-3.5 text-text">
                      {row.availableQuantity}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.reorderLevel}
                    </td>
                    <td className="px-4 py-3.5 text-text">
                      {row.averageCostLabel}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.lastStockedLabel}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          statusClass(row.stockStatus),
                        )}
                      >
                        {row.stockStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => onAdjustRow(row)}
                        >
                          Adjust
                        </Button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                          aria-label={`More actions for ${row.productName}`}
                          disabled
                          title="Actions coming soon"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InventoryPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
