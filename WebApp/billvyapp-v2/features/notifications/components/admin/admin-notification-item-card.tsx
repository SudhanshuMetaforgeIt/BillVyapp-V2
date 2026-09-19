'use client';

import React from 'react';
import Link from 'next/link';
import {
  Receipt,
  Calendar,
  Users,
  ShieldAlert,
  Megaphone,
  Check,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
} from 'lucide-react';
import type { AdminNotificationItem } from '../../types/admin-notifications.types';

type Props = {
  item: AdminNotificationItem;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
};

export function AdminNotificationItemCard({ item, onToggleRead, onDelete }: Props) {
  const getCategoryConfig = (cat: AdminNotificationItem['category']) => {
    switch (cat) {
      case 'billing':
        return {
          icon: Receipt,
          badgeBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
          label: 'Billing & Sales',
        };
      case 'appointments':
        return {
          icon: Calendar,
          badgeBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
          label: 'Appointment',
        };
      case 'staff':
        return {
          icon: Users,
          badgeBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
          label: 'Staff & Ops',
        };
      case 'campaigns':
        return {
          icon: Megaphone,
          badgeBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
          label: 'Campaign',
        };
      case 'system':
      default:
        return {
          icon: ShieldAlert,
          badgeBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
          label: 'System Alert',
        };
    }
  };

  const config = getCategoryConfig(item.category);
  const Icon = config.icon;

  return (
    <div
      className={`group relative rounded-2xl border p-5 transition-all hover:shadow-sm ${
        !item.isRead
          ? 'border-amber-300/80 bg-amber-50/20 dark:border-amber-900/50 dark:bg-amber-950/10'
          : 'border-stone-200/90 bg-white dark:border-stone-800 dark:bg-stone-900'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Category Icon Badge */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs ${config.badgeBg}`}
        >
          <Icon className="h-5 w-5 stroke-[1.8]" />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                {item.title}
              </h4>
              {!item.isRead && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500" title="Unread" />
              )}
            </div>

            {/* Timestamp & Meta */}
            <div className="flex items-center gap-2 text-[11px] text-stone-400 dark:text-stone-500">
              <Clock className="h-3 w-3" />
              <span>{item.timestamp}</span>
            </div>
          </div>

          <p className="mt-1 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            {item.message}
          </p>

          {/* Footer with Branch tag & Actions */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800/60">
            <div className="flex items-center gap-2 text-xs">
              {item.branchName && (
                <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  <MapPin className="h-3 w-3 text-stone-400" />
                  {item.branchName}
                </span>
              )}
              <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[10px] text-stone-400 dark:bg-stone-800/50">
                {config.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {item.actionUrl && item.actionLabel && (
                <Link
                  href={item.actionUrl}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/80 px-2.5 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  {item.actionLabel}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              <button
                type="button"
                onClick={() => onToggleRead(item.id)}
                title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <Check className={`h-3.5 w-3.5 ${item.isRead ? 'text-stone-400' : 'text-amber-500'}`} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                title="Delete notification"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
