'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  TicketCategoryFilter,
  TicketPriorityFilter,
  TicketStatusFilter,
} from '../types/support.types';

type SupportFiltersProps = {
  search: string;
  status: TicketStatusFilter;
  priority: TicketPriorityFilter;
  category: TicketCategoryFilter;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TicketStatusFilter) => void;
  onPriorityChange: (value: TicketPriorityFilter) => void;
  onCategoryChange: (value: TicketCategoryFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  className?: string;
};

const selectClassName =
  'h-11 rounded-lg border border-border bg-background px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne';

export function SupportFilters({
  search,
  status,
  priority,
  category,
  dateFrom,
  dateTo,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onDateFromChange,
  onDateToChange,
  className,
}: SupportFiltersProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:p-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ticket ID, subject or customer..."
            aria-label="Search tickets"
            className="h-11 bg-background pl-9"
          />
        </div>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as TicketStatusFilter)}
          aria-label="Filter by status"
          className={selectClassName}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={priority}
          onChange={(e) =>
            onPriorityChange(e.target.value as TicketPriorityFilter)
          }
          aria-label="Filter by priority"
          className={selectClassName}
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={category}
          onChange={(e) =>
            onCategoryChange(e.target.value as TicketCategoryFilter)
          }
          aria-label="Filter by category"
          className={selectClassName}
        >
          <option value="all">All Categories</option>
          <option value="billing">Billing</option>
          <option value="payments">Payments</option>
          <option value="account">Account</option>
          <option value="feature_request">Feature Request</option>
          <option value="subscription">Subscription</option>
          <option value="reports">Reports</option>
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
      </div>
    </div>
  );
}
