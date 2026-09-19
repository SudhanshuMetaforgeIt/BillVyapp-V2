'use client';

import React from 'react';
import { Search, CheckCheck, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminNotificationCategory } from '../../types/admin-notifications.types';

type Props = {
  search: string;
  onSearchChange: (val: string) => void;
  selectedCategory: AdminNotificationCategory;
  onCategoryChange: (cat: AdminNotificationCategory) => void;
  unreadOnly: boolean;
  onUnreadOnlyToggle: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onRestoreSamples: () => void;
  totalCount: number;
  unreadCount: number;
};

export function AdminNotificationsFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  unreadOnly,
  onUnreadOnlyToggle,
  onMarkAllRead,
  onClearAll,
  onRestoreSamples,
  totalCount,
  unreadCount,
}: Props) {
  const tabs: { key: AdminNotificationCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'billing', label: 'Billing' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'staff', label: 'Staff' },
    { key: 'system', label: 'System' },
    { key: 'campaigns', label: 'Campaigns' },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notifications by keyword, bill ID, staff..."
            className="h-10 rounded-xl border-stone-200 bg-white pl-10 text-xs shadow-none placeholder:text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {totalCount === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRestoreSamples}
              className="h-9 text-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore Alerts
            </Button>
          )}

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkAllRead}
              className="h-9 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Mark all as read
            </Button>
          )}

          {totalCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-9 text-xs text-stone-400 hover:text-rose-500 dark:hover:text-rose-400"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Categories & Unread Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-100 dark:border-stone-800/80">
        {tabs.map((t) => {
          const isActive = selectedCategory === t.key && !unreadOnly;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                if (unreadOnly) onUnreadOnlyToggle();
                onCategoryChange(t.key);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-amber-500 text-stone-900 shadow-xs'
                  : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/70 dark:bg-stone-800/70 dark:text-stone-400 dark:hover:bg-stone-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}

        {/* Unread Only filter pill */}
        <button
          type="button"
          onClick={onUnreadOnlyToggle}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            unreadOnly
              ? 'bg-amber-500 text-stone-900 shadow-xs'
              : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/70 dark:bg-stone-800/70 dark:text-stone-400 dark:hover:bg-stone-800'
          }`}
        >
          <span>Unread Only</span>
          {unreadCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                unreadOnly
                  ? 'bg-stone-900 text-amber-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
