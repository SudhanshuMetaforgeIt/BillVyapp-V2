'use client';

import React from 'react';
import { Bell, Receipt, Calendar, Users, ShieldAlert } from 'lucide-react';

type Props = {
  total: number;
  unread: number;
  billing: number;
  appointments: number;
  staff: number;
};

export function AdminNotificationsStats({
  total,
  unread,
  billing,
  appointments,
  staff,
}: Props) {
  const cards = [
    {
      label: 'All Notifications',
      value: total,
      subtext: 'Across all franchise branches',
      icon: Bell,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      label: 'Unread Alerts',
      value: unread,
      subtext: unread > 0 ? `${unread} require attention` : 'All caught up',
      icon: ShieldAlert,
      iconBg: unread > 0 ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
      isHighlight: unread > 0,
    },
    {
      label: 'Billing & Payments',
      value: billing,
      subtext: 'Invoices, UPI & POS updates',
      icon: Receipt,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      label: 'Appointments',
      value: appointments,
      subtext: 'Bookings & schedule changes',
      icon: Calendar,
      iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
    },
    {
      label: 'Staff & Ops',
      value: staff,
      subtext: 'Check-ins & daily shifts',
      icon: Users,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`rounded-2xl border bg-white p-4 shadow-xs transition-shadow hover:shadow-sm dark:bg-stone-900 ${
              card.isHighlight
                ? 'border-amber-400/80 dark:border-amber-500/50'
                : 'border-stone-200/90 dark:border-stone-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon className="h-4 w-4 stroke-[2]" />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                {card.value}
              </span>
              <p className="mt-0.5 text-[11px] text-stone-400 dark:text-stone-500 truncate">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
