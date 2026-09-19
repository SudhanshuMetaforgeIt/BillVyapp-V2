'use client';

import React, { useMemo, useState } from 'react';
import { Bell, BellOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminNotifications } from '../../hooks/use-admin-notifications';
import { AdminNotificationsStats } from './admin-notifications-stats';
import { AdminNotificationsFilters } from './admin-notifications-filters';
import { AdminNotificationItemCard } from './admin-notification-item-card';
import type { AdminNotificationCategory } from '../../types/admin-notifications.types';

export function AdminNotificationsPageView() {
  const {
    notifications,
    unreadCount,
    categoryCounts,
    markAllAsRead,
    toggleReadStatus,
    deleteNotification,
    clearAll,
    resetToSample,
  } = useAdminNotifications();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AdminNotificationCategory>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Filtered notifications
  const filteredItems = useMemo(() => {
    return notifications.filter((item) => {
      if (unreadOnly && item.isRead) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchMessage = item.message.toLowerCase().includes(q);
        const matchBranch = item.branchName?.toLowerCase().includes(q);
        if (!matchTitle && !matchMessage && !matchBranch) return false;
      }
      return true;
    });
  }, [notifications, selectedCategory, unreadOnly, search]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Notifications
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Stay updated on bills, appointments, staff activities, and system alerts.
        </p>
      </div>

      {/* Stats Summary Bar */}
      <AdminNotificationsStats
        total={notifications.length}
        unread={unreadCount}
        billing={categoryCounts.billing}
        appointments={categoryCounts.appointments}
        staff={categoryCounts.staff}
      />

      {/* Filter and Action Controls */}
      <AdminNotificationsFilters
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        unreadOnly={unreadOnly}
        onUnreadOnlyToggle={() => setUnreadOnly((prev) => !prev)}
        onMarkAllRead={markAllAsRead}
        onClearAll={clearAll}
        onRestoreSamples={resetToSample}
        totalCount={notifications.length}
        unreadCount={unreadCount}
      />

      {/* Notification Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-200/90 bg-white py-16 text-center shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              {unreadOnly ? (
                <Sparkles className="h-7 w-7 stroke-[1.8]" />
              ) : (
                <BellOff className="h-7 w-7 stroke-[1.8]" />
              )}
            </div>

            <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-white">
              {unreadOnly
                ? 'All caught up!'
                : search
                ? 'No matching notifications'
                : 'No notifications right now'}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
              {unreadOnly
                ? 'You have read all pending notifications across all branches.'
                : search
                ? `No alerts matching "${search}". Try adjusting your filters.`
                : 'New bills, customer bookings, and staff alerts will appear here in real-time.'}
            </p>

            {notifications.length === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToSample}
                className="mt-5 rounded-xl border-amber-500/80 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                Restore Sample Notifications
              </Button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <AdminNotificationItemCard
              key={item.id}
              item={item}
              onToggleRead={toggleReadStatus}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>
    </div>
  );
}
