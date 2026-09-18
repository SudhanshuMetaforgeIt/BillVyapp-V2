'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '../types/customers.types';

type CustomersPaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageWindow(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

export function CustomersPagination({
  meta,
  onPageChange,
  className,
}: CustomersPaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = pageWindow(page, Math.max(totalPages, 1));

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-text-secondary">
        Showing{' '}
        <span className="font-semibold text-text">
          {formatNumber(from)} to {formatNumber(to)}
        </span>{' '}
        of <span className="font-semibold text-text">{formatNumber(total)}</span>{' '}
        customers.
      </p>

      <div className="flex flex-wrap items-center gap-1">
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

        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`e-${index}`}
              className="px-1.5 text-sm text-text-secondary"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              size="icon-sm"
              variant={item === page ? 'default' : 'outline'}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                item === page
                  ? 'bg-champagne text-white hover:bg-champagne/90'
                  : 'border-border text-text',
              )}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
