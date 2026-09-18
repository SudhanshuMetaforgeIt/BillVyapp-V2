'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Plus, Scissors } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToggleServiceStatus } from '../hooks/use-services';
import type { ServiceItem } from '../types/services.types';

type ServicesTableProps = {
  services: ServiceItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddService: () => void;
  onEditService?: (service: ServiceItem) => void;
};

export function ServicesTable({
  services,
  total,
  currentPage,
  totalPages,
  onPageChange,
  onAddService,
  onEditService,
}: ServicesTableProps) {
  const toggleMutation = useToggleServiceStatus();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (service: ServiceItem) => {
    setTogglingId(service.id);
    try {
      await toggleMutation.mutateAsync({
        id: service.id,
        isActive: !service.isActive,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const startRecord = total > 0 ? (currentPage - 1) * 10 + 1 : 0;
  const endRecord = Math.min(currentPage * 10, total);

  return (
    <div className="app-surface-card overflow-hidden">
      {services.length === 0 ? (
        <div className="py-12 text-center">
          <SectionEmptyState
            title="No services found"
            message="You haven't added any services yet. Click below to add your first service and define your pricing."
          />
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-brand-orange text-white hover:bg-brand-orange-dark"
              onClick={onAddService}
            >
              <Plus className="size-4" />
              Add New Service
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
                  <th className="px-5 py-3.5">Service Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Branch</th>
                  <th className="px-5 py-3.5">Price (₹)</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-ivory/50 transition-colors">
                    {/* Service Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                          <Scissors className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-text">{s.name}</p>
                          {s.description ? (
                            <p className="max-w-[200px] truncate text-xs text-text-secondary">
                              {s.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-text-secondary">{s.categoryName}</td>

                    {/* Branch */}
                    <td className="px-5 py-3.5 text-text-secondary">{s.branchName}</td>

                    {/* Price */}
                    <td className="px-5 py-3.5 font-bold text-text">
                      {s.price.toLocaleString('en-IN')}
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-3.5 text-text-secondary">
                      {s.durationMinutes} mins
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={s.isActive ? 'Active' : 'Inactive'}
                        tone={s.isActive ? 'success' : 'danger'}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit pencil button */}
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal transition"
                          onClick={() => onEditService?.(s)}
                          aria-label={`Edit ${s.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>

                        {/* Interactive toggle switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={s.isActive}
                          disabled={togglingId === s.id}
                          onClick={() => handleToggle(s)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            s.isActive ? 'bg-brand-orange' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              s.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* More menu */}
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal transition"
                          aria-label="More actions"
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

          {/* Mobile / Tablet Cards */}
          <ul className="divide-y divide-border lg:hidden">
            {services.map((s) => (
              <li key={s.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                      <Scissors className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-text">{s.name}</p>
                      <p className="text-xs text-text-secondary">{s.categoryName}</p>
                    </div>
                  </div>
                  <StatusBadge
                    label={s.isActive ? 'Active' : 'Inactive'}
                    tone={s.isActive ? 'success' : 'danger'}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-ivory/60 p-2 text-center text-xs">
                  <div>
                    <p className="text-text-muted">Branch</p>
                    <p className="truncate font-semibold text-text">{s.branchName}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Price</p>
                    <p className="font-bold text-text">₹{s.price.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Duration</p>
                    <p className="font-semibold text-text">{s.durationMinutes}m</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-text-secondary">Toggle status</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.isActive}
                      onClick={() => handleToggle(s)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        s.isActive ? 'bg-brand-orange' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          s.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-text-secondary hover:bg-champagne-light"
                      onClick={() => onEditService?.(s)}
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Footer & Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-text-secondary">
            <span>
              Showing {startRecord} to {endRecord} of {total} services
            </span>

            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="rounded-lg border border-border p-1.5 hover:bg-champagne-light disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPageChange(p)}
                      className={`size-7 rounded-lg text-xs font-bold transition ${
                        p === currentPage
                          ? 'bg-brand-orange text-white'
                          : 'border border-border text-text hover:bg-champagne-light'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="rounded-lg border border-border p-1.5 hover:bg-champagne-light disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
