'use client';

import { formatCurrency } from '@/lib/format';

import { Eye, Pencil, Plus, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminBranchItem } from '../../types/admin-my-business.types';

const formatRevenue = (value: number | null) =>
  value === null ? '—' : formatCurrency(value);

type AdminBranchesTableProps = {
  branches: AdminBranchItem[];
  onAddBranch?: () => void;
  onViewBranch?: (branch: AdminBranchItem) => void;
  onEditBranch?: (branch: AdminBranchItem) => void;
};

export function AdminBranchesTable({
  branches,
  onAddBranch,
  onViewBranch,
  onEditBranch,
}: AdminBranchesTableProps) {
  return (
    <div className="space-y-3">
      {/* Header bar — single bottom rule; tab underline sits on that rule */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <h2 className="relative pb-2.5 text-base font-bold text-text sm:text-lg">
          All Branches ({branches.length})
          <span
            className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-orange"
            aria-hidden
          />
        </h2>

        <Button
          type="button"
          size="sm"
          className="mb-1.5 gap-1.5 bg-brand-orange text-white shadow-sm hover:bg-brand-orange-dark"
          onClick={onAddBranch}
        >
          <Plus className="size-4" />
          Add New Branch
        </Button>
      </div>

      {/* Table Container */}
      <div className="app-surface-card overflow-hidden">
        {branches.length === 0 ? (
          <div className="py-12 text-center">
            <SectionEmptyState
              title="No branches found"
              message="You haven't added any branches yet. Click below to add your first franchise branch and begin setup."
            />
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-brand-orange text-white hover:bg-brand-orange-dark"
                onClick={onAddBranch}
              >
                <Plus className="size-4" />
                Add New Branch
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table — table-fixed so columns fit; no horizontal scroll */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Scrollable table"
              className="app-table-scroll hidden min-w-0 lg:block"
            >
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border bg-ivory/70 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <tr>
                    <th className="w-[18%] px-3 py-3.5 xl:px-4">Branch</th>
                    <th className="w-[14%] px-3 py-3.5 xl:px-4">Location</th>
                    <th className="w-[11%] px-3 py-3.5 xl:px-4">Code</th>
                    <th className="w-[16%] px-3 py-3.5 xl:px-4">Manager</th>
                    <th className="w-[10%] px-3 py-3.5 xl:px-4">Status</th>
                    <th className="w-[8%] px-3 py-3.5 xl:px-4">Staff</th>
                    <th className="w-[14%] px-3 py-3.5 xl:px-4">Revenue</th>
                    <th className="w-[9%] px-3 py-3.5 text-right xl:px-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branches.map((b) => (
                    <tr
                      key={b.id}
                      className="transition-colors hover:bg-ivory/50"
                    >
                      <td className="px-3 py-3.5 xl:px-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-champagne">
                            <Store className="size-4 text-champagne" />
                          </div>
                          <p
                            className="truncate font-bold text-text"
                            title={b.name}
                          >
                            {b.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-text-secondary xl:px-4">
                        <p className="truncate text-xs" title={b.location}>
                          {b.location}
                        </p>
                      </td>

                      <td className="px-3 py-3.5 font-mono text-xs font-semibold text-text xl:px-4">
                        <span className="block truncate" title={b.code}>
                          {b.code}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 xl:px-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                            {b.managerInitials}
                          </span>
                          <div className="min-w-0">
                            <p
                              className="truncate text-xs font-semibold text-text"
                              title={b.managerName ?? undefined}
                            >
                              {b.managerName ?? '—'}
                            </p>
                            <p className="truncate text-[11px] text-text-muted">
                              {b.managerPhone ?? ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 xl:px-4">
                        <StatusBadge
                          label={b.status === 'active' ? 'Active' : 'Inactive'}
                          tone={b.status === 'active' ? 'success' : 'danger'}
                          className="whitespace-nowrap"
                        />
                      </td>

                      <td className="px-3 py-3.5 font-semibold tabular-nums text-text xl:px-4">
                        {b.staffCount ?? '—'}
                      </td>

                      <td className="px-3 py-3.5 font-bold tabular-nums text-text xl:px-4">
                        <span
                          className="block truncate"
                          title={formatRevenue(b.revenueMonth)}
                        >
                          {formatRevenue(b.revenueMonth)}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-right xl:px-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-text-secondary transition hover:bg-champagne-light hover:text-charcoal"
                            onClick={() => onViewBranch?.(b)}
                            aria-label={`View ${b.name}`}
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-text-secondary transition hover:bg-champagne-light hover:text-charcoal"
                            onClick={() => onEditBranch?.(b)}
                            aria-label={`Edit ${b.name}`}
                          >
                            <Pencil className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <ul className="divide-y divide-border lg:hidden">
              {branches.map((b) => (
                <li key={b.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-champagne">
                        <Store className="size-5 text-champagne" />
                      </div>
                      <div>
                        <p className="font-bold text-text">{b.name}</p>
                        <p className="text-xs text-text-secondary">
                          {b.location}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={b.status === 'active' ? 'Active' : 'Inactive'}
                      tone={b.status === 'active' ? 'success' : 'danger'}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-ivory/60 p-2.5 text-center text-xs">
                    <div>
                      <p className="text-text-muted">Code</p>
                      <p className="font-mono font-bold text-text">{b.code}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Staff</p>
                      <p className="font-bold text-text">
                        {b.staffCount ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Revenue</p>
                      <p className="font-bold text-text">
                        {formatRevenue(b.revenueMonth)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Manager: {b.managerName ?? '—'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded p-1 text-text-secondary hover:bg-champagne-light"
                        onClick={() => onViewBranch?.(b)}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-text-secondary hover:bg-champagne-light"
                        onClick={() => onEditBranch?.(b)}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer pagination info */}
            <div className="border-t border-border px-5 py-3 text-xs text-text-secondary">
              Showing 1 to {branches.length} of {branches.length} branches
            </div>
          </>
        )}
      </div>
    </div>
  );
}
