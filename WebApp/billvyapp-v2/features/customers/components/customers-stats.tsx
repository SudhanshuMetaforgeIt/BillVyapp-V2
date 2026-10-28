'use client';

import { CurrencyIcon } from '@/components/ui/currency-icon';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Skeleton } from '@/components/ui/skeleton';

import { getBusinessRegion } from '@/lib/business-region';

import {
  RotateCcw,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import type { CustomerStats } from '../types/admin-customers.types';

type CustomersStatsProps = {
  stats: CustomerStats;
  loading?: boolean;
};

export function CustomersStats({ stats, loading }: CustomersStatsProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat(getBusinessRegion().locale, {
      style: 'currency',
      currency: getBusinessRegion().currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      id: 'total-customers',
      label: 'Total Customers',
      value: <AnimatedNumber value={stats.totalCustomers} />,
      subtitle: stats.totalCustomersChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Users,
      iconBg:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      hasTrendIcon: stats.totalCustomers > 0,
    },
    {
      id: 'new-customers',
      label: 'New Customers (This Month)',
      value: <AnimatedNumber value={stats.newCustomers} />,
      subtitle: stats.newCustomersChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: UserPlus,
      iconBg:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
      hasTrendIcon: stats.newCustomers > 0,
    },
    {
      id: 'returning-customers',
      label: 'Returning Customers',
      value: <AnimatedNumber value={stats.returningCustomers} />,
      subtitle: `${stats.returningCustomersPct}% of total`,
      subtitleColor: 'text-purple-600 dark:text-purple-400',
      icon: RotateCcw,
      iconBg:
        'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    },
    {
      id: 'total-spent',
      label: 'Total Spent (This Month)',
      value: <AnimatedNumber value={stats.totalSpentThisMonth} format={formatINR} />,
      subtitle: stats.totalSpentChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: CurrencyIcon,
      iconBg:
        'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      hasTrendIcon: stats.totalSpentThisMonth > 0,
    },
  ];

  return (
    <div className="app-stat-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="app-customer-stat-card app-metric-card rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div
              className={`app-customer-stat-icon flex size-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <Icon className="size-5" />
            </div>

            <div className="contents">
              <span className="app-customer-stat-label block text-xs font-medium text-stone-500 dark:text-stone-400">
                {card.label}
              </span>
              <div className="app-customer-stat-value font-bold tracking-tight text-stone-900 dark:text-white">
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  card.value
                )}
              </div>
              <div className="app-customer-stat-caption flex items-center gap-1">
                {card.hasTrendIcon && (
                  <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                )}
                <span
                  className={`text-[11px] font-medium ${card.subtitleColor}`}
                >
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
