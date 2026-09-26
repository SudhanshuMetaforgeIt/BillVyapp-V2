'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import type { PaginationMeta } from '@/types/models';

type PaginationBarProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  noun?: string;
};

/** Server-side pagination driven entirely by the backend `meta` block. */
export function PaginationBar({ meta, onPageChange, noun = 'records' }: PaginationBarProps) {
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-secondary">
        Showing{' '}
        <span className="font-semibold text-text">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        of <span className="font-semibold text-text">{formatNumber(total)}</span> {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm tabular-nums text-text-secondary">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
