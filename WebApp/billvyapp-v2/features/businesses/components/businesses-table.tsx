'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Power, Tags, UserRound } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format';
import type { BusinessListRow } from '../types/businesses.types';
import { BusinessesPagination } from './businesses-pagination';
import type { PaginationMeta } from '../types/businesses.types';

type BusinessesTableProps = {
  rows: BusinessListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onEditBusiness: (row: BusinessListRow) => void;
  onEnrollPlan: (row: BusinessListRow) => void;
  onToggleStatus: (row: BusinessListRow) => void;
  statusPendingId?: string | null;
};

function planTone(
  tone: BusinessListRow['planTone'],
): 'info' | 'accent' | 'neutral' {
  if (tone === 'professional') return 'accent';
  if (tone === 'basic') return 'info';
  if (tone === 'enterprise') return 'neutral';
  return 'neutral';
}

function statusTone(
  status: BusinessListRow['status'],
): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

function RowActions({
  row,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onEditBusiness,
  onEnrollPlan,
  onToggleStatus,
  statusPending,
}: {
  row: BusinessListRow;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEditBusiness: (row: BusinessListRow) => void;
  onEnrollPlan: (row: BusinessListRow) => void;
  onToggleStatus: (row: BusinessListRow) => void;
  statusPending: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      setPos(null);
      return;
    }

    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      if (el.getClientRects().length === 0) {
        setPos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const width = 168;
      setPos({
        top: rect.bottom + 6,
        left: Math.min(rect.right - width, window.innerWidth - width - 8),
      });
    };
    place();

    const onPointerDown = (event: PointerEvent) => {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onCloseMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMenu();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [menuOpen, onCloseMenu]);

  const runAction =
    (action: () => void) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      // Fire on pointerdown so the document outside-close listener cannot
      // unmount the menu before a click handler would run.
      event.preventDefault();
      event.stopPropagation();
      if (statusPending) return;
      onCloseMenu();
      action();
    };

  const menu =
    menuOpen && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[300] min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
            style={{ top: pos.top, left: pos.left, width: 168 }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-champagne-light"
              onPointerDown={runAction(() => onEditBusiness(row))}
            >
              <Pencil className="size-3.5 text-text-secondary" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-champagne-light"
              onPointerDown={runAction(() => onEnrollPlan(row))}
            >
              <Tags className="size-3.5 text-text-secondary" aria-hidden />
              {row.subscriptionActive ? 'Change plan' : 'Enroll plan'}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={statusPending}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-champagne-light disabled:opacity-50"
              onPointerDown={runAction(() => onToggleStatus(row))}
            >
              <Power className="size-3.5 text-text-secondary" aria-hidden />
              {row.isActive ? 'Suspend' : 'Activate'}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        ref={triggerRef}
        type="button"
        className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        aria-label={`More actions for ${row.name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        <MoreVertical className="size-4" />
      </button>
      {menu}
    </div>
  );
}

export function BusinessesTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
  onEditBusiness,
  onEnrollPlan,
  onToggleStatus,
  statusPendingId,
}: BusinessesTableProps) {
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const closeMenu = useCallback(() => setMenuRowId(null), []);

  return (
    <div className="app-panel app-surface-card min-w-0" data-dash-animate="section">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load businesses. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No businesses found"
          message="Try adjusting your search or filters, or add a new business."
        />
      ) : (
        <>
          <div className="app-businesses-table relative min-w-0">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: '29%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Business</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Joined On</th>
                  <th className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-ivory/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                          {row.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-text">
                            {row.name}
                          </p>
                          <p className="break-words text-xs text-text-secondary">
                            {row.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex min-w-0 max-w-full items-center gap-2 text-text-secondary">
                        <UserRound className="size-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0 break-words">{row.ownerLabel}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.planLabel}
                        tone={planTone(row.planTone)}
                        className="max-w-full whitespace-normal [overflow-wrap:anywhere]"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.statusLabel}
                        tone={statusTone(row.status)}
                        className="max-w-full whitespace-normal [overflow-wrap:anywhere]"
                      />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {formatDate(row.joinedOn)}
                    </td>
                    <td className="px-5 py-3.5">
                      <RowActions
                        row={row}
                        menuOpen={menuRowId === row.id}
                        onToggleMenu={() =>
                          setMenuRowId((current) =>
                            current === row.id ? null : row.id,
                          )
                        }
                        onCloseMenu={closeMenu}
                        onEditBusiness={onEditBusiness}
                        onEnrollPlan={onEnrollPlan}
                        onToggleStatus={onToggleStatus}
                        statusPending={statusPendingId === row.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="app-businesses-cards divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-[1_1_12rem] items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                      {row.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-text">
                        {row.name}
                      </p>
                      <p className="break-words text-xs text-text-secondary">
                        {row.code}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
                    <StatusBadge
                      label={row.statusLabel}
                      tone={statusTone(row.status)}
                      className="max-w-full whitespace-normal [overflow-wrap:anywhere]"
                    />
                    <RowActions
                      row={row}
                      menuOpen={menuRowId === row.id}
                      onToggleMenu={() =>
                        setMenuRowId((current) =>
                          current === row.id ? null : row.id,
                        )
                      }
                      onCloseMenu={closeMenu}
                      onEditBusiness={onEditBusiness}
                      onEnrollPlan={onEnrollPlan}
                      onToggleStatus={onToggleStatus}
                      statusPending={statusPendingId === row.id}
                    />
                  </div>
                </div>
                <p className="break-words text-sm text-text-secondary">Owner: {row.ownerLabel}</p>
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  <StatusBadge
                    label={row.planLabel}
                    tone={planTone(row.planTone)}
                    className="max-w-full whitespace-normal [overflow-wrap:anywhere]"
                  />
                  <span className="text-xs text-text-secondary">
                    Joined {formatDate(row.joinedOn)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <BusinessesPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
