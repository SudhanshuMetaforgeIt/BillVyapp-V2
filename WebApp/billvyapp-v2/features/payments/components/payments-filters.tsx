'use client';

import { Filter, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  FranchiseOption,
  PaymentMethodFilter,
  PaymentStatusFilter,
} from '../types/payments.types';

type PaymentsFiltersProps = {
  search: string;
  franchiseId: string;
  method: PaymentMethodFilter;
  status: PaymentStatusFilter;
  dateFrom: string;
  dateTo: string;
  franchises: FranchiseOption[];
  onSearchChange: (value: string) => void;
  onFranchiseChange: (value: string) => void;
  onMethodChange: (value: PaymentMethodFilter) => void;
  onStatusChange: (value: PaymentStatusFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  className?: string;
};

const selectClassName =
  'h-11 rounded-lg border border-border bg-background px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne';

export function PaymentsFilters({
  search,
  franchiseId,
  method,
  status,
  dateFrom,
  dateTo,
  franchises,
  onSearchChange,
  onFranchiseChange,
  onMethodChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  className,
}: PaymentsFiltersProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:p-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Payment ID, Business or Customer..."
            aria-label="Search payments"
            className="h-11 bg-background pl-9"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={franchiseId}
            onChange={(e) => onFranchiseChange(e.target.value)}
            aria-label="Filter by business"
            className={selectClassName}
          >
            <option value="all">All Businesses</option>
            {franchises.map((franchise) => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.name}
              </option>
            ))}
          </select>

          <select
            value={method}
            onChange={(e) =>
              onMethodChange(e.target.value as PaymentMethodFilter)
            }
            aria-label="Filter by payment method"
            className={selectClassName}
          >
            <option value="all">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="WALLET">Wallet</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as PaymentStatusFilter)
            }
            aria-label="Filter by status"
            className={selectClassName}
          >
            <option value="all">All Status</option>
            <option value="SUCCESS">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              aria-label="Date from"
              className="h-11 w-auto bg-background"
            />
            <span className="text-xs text-text-secondary">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              aria-label="Date to"
              className="h-11 w-auto bg-background"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 gap-2 border-brand-orange text-brand-orange hover:bg-brand-orange/5"
            disabled
            title="Additional filters coming soon"
          >
            <Filter className="size-4" aria-hidden />
            Filter
          </Button>
        </div>
      </div>
    </div>
  );
}
