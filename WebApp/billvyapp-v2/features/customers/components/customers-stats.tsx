'use client';

import {
  IndianRupee,
  RotateCcw,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import type { CustomerStats } from '../types/customers.types';

type CustomersStatsProps = {
  stats: CustomerStats;
  loading?: boolean;
};

export function CustomersStats({ stats, loading }: CustomersStatsProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      id: 'total-customers',
      label: 'Total Customers',
      value: stats.totalCustomers.toLocaleString('en-IN'),
      subtitle: stats.totalCustomersChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Users,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      hasTrendIcon: stats.totalCustomers > 0,
    },
    {
      id: 'new-customers',
      label: 'New Customers (This Month)',
      value: stats.newCustomers.toLocaleString('en-IN'),
      subtitle: stats.newCustomersChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: UserPlus,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
      hasTrendIcon: stats.newCustomers > 0,
    },
    {
      id: 'returning-customers',
      label: 'Returning Customers',
      value: stats.returningCustomers.toLocaleString('en-IN'),
      subtitle: `${stats.returningCustomersPct}% of total`,
      subtitleColor: 'text-purple-600 dark:text-purple-400',
      icon: RotateCcw,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    },
    {
      id: 'total-spent',
      label: 'Total Spent (This Month)',
      value: formatINR(stats.totalSpentThisMonth),
      subtitle: stats.totalSpentChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: IndianRupee,
      iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      hasTrendIcon: stats.totalSpentThisMonth > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="flex items-start gap-4 rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                {card.label}
              </span>
              <div className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-white truncate">
                {loading ? (
                  <div className="h-7 w-16 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                ) : (
                  card.value
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                {card.hasTrendIcon && (
                  <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className={`text-[11px] font-medium ${card.subtitleColor}`}>
                  {card.subtitle}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
