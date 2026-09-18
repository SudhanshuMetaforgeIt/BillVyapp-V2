'use client';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  NotificationChannelFilter,
  NotificationStatusFilter,
} from '../types/notifications.types';

type NotificationsFiltersProps = {
  search: string;
  channel: NotificationChannelFilter;
  status: NotificationStatusFilter;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (value: string) => void;
  onChannelChange: (value: NotificationChannelFilter) => void;
  onStatusChange: (value: NotificationStatusFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSend: () => void;
  className?: string;
};

const selectClassName =
  'h-11 rounded-lg border border-border bg-background px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne';

export function NotificationsFilters({
  search,
  channel,
  status,
  dateFrom,
  dateTo,
  onSearchChange,
  onChannelChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onSend,
  className,
}: NotificationsFiltersProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title or message..."
            aria-label="Search notifications"
            className="h-11 bg-background pl-9"
          />
        </div>

        <select
          value={channel}
          onChange={(e) =>
            onChannelChange(e.target.value as NotificationChannelFilter)
          }
          aria-label="Filter by channel"
          className={selectClassName}
        >
          <option value="all">All Channels</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>

        <select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as NotificationStatusFilter)
          }
          aria-label="Filter by status"
          className={selectClassName}
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="QUEUED">Queued</option>
          <option value="SENT">Sent</option>
          <option value="DELIVERED">Delivered</option>
          <option value="READ">Read</option>
          <option value="FAILED">Failed</option>
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
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onSend}
        className="h-11 gap-2 bg-brand-orange text-white hover:bg-brand-orange-deep focus-visible:ring-brand-orange"
      >
        <Plus className="size-4" aria-hidden />
        Send Notification
      </Button>
    </div>
  );
}
