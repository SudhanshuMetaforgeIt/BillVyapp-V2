'use client';

import { useState } from 'react';
import { Eye, MoreHorizontal, Pencil, Plus, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminBranchItem } from '../../types/admin-my-business.types';

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
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <h2 className="relative pb-2 text-base font-bold text-text sm:text-lg">
            All Branches ({branches.length})
            <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-orange" />
          </h2>
        </div>

        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm"
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
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-ivory/70 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <tr>
                    <th className="px-5 py-3.5">Branch Name</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Branch Code</th>
                    <th className="px-5 py-3.5">Manager</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Staff</th>
                    <th className="px-5 py-3.5">Revenue (This Month)</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-ivory/50 transition-colors">
                      {/* Name & Photo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-champagne">
                            <Store className="size-5 text-champagne" />
                          </div>
                          <div>
                            <p className="font-bold text-text">{b.name}</p>
                            {b.isMain ? (
                              <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 border border-amber-500/20">
                                Main Branch
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5 text-text-secondary">
                        <p className="max-w-[160px] truncate text-xs">{b.location}</p>
                      </td>

                      {/* Code */}
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-text">
                        {b.code}
                      </td>

                      {/* Manager */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                            {b.managerInitials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-text">
                              {b.managerName}
                            </p>
                            <p className="truncate text-[11px] text-text-muted">{b.managerPhone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          label={b.status === 'active' ? 'Active' : 'Inactive'}
                          tone={b.status === 'active' ? 'success' : 'danger'}
                        />
                      </td>

                      {/* Staff */}
                      <td className="px-5 py-3.5 font-semibold text-text">{b.staffCount}</td>

                      {/* Revenue */}
                      <td className="px-5 py-3.5 font-bold text-text">
                        ₹{b.revenueMonth.toLocaleString('en-IN')}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal transition"
                            onClick={() => onViewBranch?.(b)}
                            aria-label={`View ${b.name}`}
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal transition"
                            onClick={() => onEditBranch?.(b)}
                            aria-label={`Edit ${b.name}`}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal transition"
                            onClick={() => setSelectedBranch(b.id)}
                            aria-label="More options"
                          >
                            <MoreHorizontal className="size-4" />
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
                        <p className="text-xs text-text-secondary">{b.location}</p>
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
                      <p className="font-bold text-text">{b.staffCount}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Revenue</p>
                      <p className="font-bold text-text">₹{b.revenueMonth.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Manager: {b.managerName}</span>
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
