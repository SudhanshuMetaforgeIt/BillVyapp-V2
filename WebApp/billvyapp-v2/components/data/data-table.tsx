'use client';

import type { ReactNode } from 'react';

import { SectionEmptyState } from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types/models';
import { PaginationBar } from './pagination-bar';
import { QueryErrorState } from './query-error-state';

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  query: {
    data?: Paginated<T>;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  rowKey: (row: T) => string;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyMessage: string;
  noun?: string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
};

/**
 * Generic list surface for any paginated endpoint. Renders the five states
 * every API-backed list needs: loading, error (status-aware), empty, rows and
 * pagination from the backend meta.
 */
export function DataTable<T>({
  columns,
  query,
  rowKey,
  onPageChange,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  noun,
  onRowClick,
  toolbar,
}: DataTableProps<T>) {
  const rows = query.data?.data ?? [];

  return (
    <div className="app-surface-card overflow-hidden">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-ivory-soft/50 px-5 py-3">
          {toolbar}
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError && !query.data ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <SectionEmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  {columns.map((col) => (
                    <th key={col.id} className={cn('px-5 py-3 font-semibold', col.className)}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      'border-b border-border last:border-0 hover:bg-ivory/60',
                      onRowClick && 'cursor-pointer',
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-5 py-3 text-text', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data && onPageChange ? (
            <PaginationBar meta={query.data.meta} onPageChange={onPageChange} noun={noun} />
          ) : null}
        </>
      )}
    </div>
  );
}
