'use client';

import { SelectInput } from '@/components/data/form-fields';

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
  'h-11 w-full min-w-0 text-sm font-medium';

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
        'app-notification-filters',
        className,
      )}
    >
      <div className="app-notification-filter-grid">
        <div className="app-notification-search relative min-w-0">
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

        <div className="app-notification-channel"><SelectInput
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
          <option value="IN_APP">In app</option>
          <option value="WHATSAPP">WhatsApp</option>
        </SelectInput></div>

        <div className="app-notification-status"><SelectInput
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
        </SelectInput></div>

        <div className="app-notification-dates">
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
        size="lg"
        onClick={onSend}
        className="app-notification-send h-11 gap-2 bg-brand-orange text-white hover:bg-brand-orange-deep focus-visible:ring-brand-orange"
      >
        <Plus className="size-4" aria-hidden />
        Send Notification
      </Button>
      </div>
    </div>
  );
}
