'use client';

import { RowActionsMenu } from '@/components/data/row-actions-menu';
import { Pencil, Tags } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusSwitch } from '@/components/ui/status-switch';
import { cn } from '@/lib/utils';
import { useToggleCategoryStatus } from '../hooks/use-service-mutations';
import type {
  CategoryListRow,
  PaginationMeta,
} from '../types/services.types';
import { ServicesPagination } from './services-pagination';

type CategoriesTableProps = {
  rows: CategoryListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

export function CategoriesTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: CategoriesTableProps) {
  const toggle = useToggleCategoryStatus();

  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <SectionErrorState
        message="We could not load categories. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <SectionEmptyState
          title="No categories found"
          message="Create a service category before adding services."
        />
        {meta.total > 0 || meta.page > 1 ? (
          <ServicesPagination
            meta={meta}
            noun="categories"
            onPageChange={onPageChange}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div tabIndex={0} role="region" aria-label="Scrollable table" className="app-table-scroll app-stacked-scroll overflow-x-auto">
        <table className="app-responsive-table w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Services</th>
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
                <td data-label="Category" className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                      <Tags className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td data-label="Services" className="px-4 py-3.5 text-text">{row.serviceCount}</td>
                <td data-label="Status" className="px-4 py-3.5">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      row.isActive
                        ? 'bg-emerald-light text-emerald'
                        : 'bg-muted text-charcoal-soft',
                    )}
                  >
                    {row.statusLabel}
                  </span>
                </td>
                <td data-label="Actions" className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                      disabled
                      title="Edit coming soon"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <StatusSwitch checked={row.isActive} label={`Toggle ${row.name} status`} disabled={toggle.isPending} onCheckedChange={(isActive) => toggle.mutate({ id: row.id, isActive, name: row.name })} />
                    <RowActionsMenu name={row.name}
      fields={[["Description", row.description], ["Services", row.serviceCount], ["Status", row.statusLabel]]}
      actions={[{ label: row.isActive ? 'Deactivate category' : 'Activate category', disabled: toggle.isPending,
        onClick: () => toggle.mutate({ id: row.id, isActive: !row.isActive, name: row.name }) }]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ServicesPagination
        meta={meta}
        noun="categories"
        onPageChange={onPageChange}
      />
    </>
  );
}
