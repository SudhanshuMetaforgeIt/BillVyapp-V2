'use client';
import { genderLabel } from '@/lib/gender';

import { RowActionsMenu } from '@/components/data/row-actions-menu';
import { Pencil, Scissors } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusSwitch } from '@/components/ui/status-switch';
import { cn } from '@/lib/utils';
import { useToggleServiceStatus } from '../hooks/use-service-mutations';
import type { PaginationMeta, ServiceListRow } from '../types/services.types';
import { ServicesPagination } from './services-pagination';

type ServicesTableProps = {
  rows: ServiceListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onEditService?: (row: ServiceListRow) => void;
};

export function ServicesTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
  onEditService,
}: ServicesTableProps) {
  const toggle = useToggleServiceStatus();

  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <SectionErrorState
        message="We could not load services. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <SectionEmptyState
          title="No services found"
          message="Try adjusting filters, or add a new service."
        />
        {meta.total > 0 || meta.page > 1 ? (
          <ServicesPagination
            meta={meta}
            noun="services"
            onPageChange={onPageChange}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div tabIndex={0} role="region" aria-label="Scrollable table" className="app-table-scroll app-stacked-scroll overflow-x-auto">
        <table className="app-responsive-table w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Service Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
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
                <td data-label="Service" className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                      <Scissors className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">
                        {row.name} · {genderLabel(row.gender)}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td data-label="Category" className="px-4 py-3.5 text-text">{row.categoryLabel}</td>
                <td data-label="Price" className="px-4 py-3.5 font-medium text-text">
                  {row.priceLabel}
                </td>
                <td data-label="Duration" className="px-4 py-3.5 text-text-secondary">
                  {row.durationLabel}
                </td>
                <td data-label="Status" className="px-4 py-3.5">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      row.isActive
                        ? 'bg-emerald-light text-emerald'
                        : 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger',
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
                      aria-label={`Edit ${row.name} (${genderLabel(row.gender)})`}
                      disabled={!onEditService}
                      onClick={() => onEditService?.(row)}
                      title="Edit service"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <StatusSwitch checked={row.isActive} label={`Toggle ${row.name} (${genderLabel(row.gender)}) status`} disabled={toggle.isPending} onCheckedChange={(isActive) => toggle.mutate({ id: row.id, isActive, name: row.name })} />
                    <RowActionsMenu name={row.name}
      fields={[["Description", row.description], ["Category", row.categoryLabel], ["Price", row.priceLabel], ["Duration", row.durationLabel], ["Status", row.statusLabel]]}
      actions={[...(onEditService ? [{ label: 'Edit service', onClick: () => onEditService(row) }] : []), { label: row.isActive ? 'Deactivate service' : 'Activate service', disabled: toggle.isPending,
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
        noun="services"
        onPageChange={onPageChange}
      />
    </>
  );
}
