'use client';

import {
  ChevronRight,
  Crown,
  Download,
  Headphones,
  Plus,
  TrendingUp,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { CustomerInsights } from '../types/admin-customers.types';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

type CustomersSidebarProps = {
  insights: CustomerInsights;
  onAddCustomer: () => void;
  onImportCustomers?: () => void;
  onDownloadCustomers?: () => void;
};

export function CustomersSidebar({
  insights,
  onAddCustomer,
  onImportCustomers,
  onDownloadCustomers,
}: CustomersSidebarProps) {
  const router = useRouter();

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const quickActions = [
    {
      id: 'add-customer',
      label: 'Add New Customer',
      icon: Plus,
      onClick: onAddCustomer,
    },
    {
      id: 'import-customers',
      label: 'Import Customers',
      icon: Upload,
      onClick: onImportCustomers,
    },
    {
      id: 'download-customers',
      label: 'Download Customers',
      icon: Download,
      onClick: onDownloadCustomers,
    },
    {
      id: 'customer-groups',
      label: 'Customer Groups',
      icon: Users,
      onClick: () => {
        // Can filter or tag
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Customer Insights Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Customer Insights
        </h3>

        <div className="mt-4 space-y-3.5 text-xs">
          {/* Most Frequent */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Most Frequent
                </div>
                <div className="font-semibold text-stone-900 dark:text-white">
                  {insights.mostFrequentCustomer
                    ? insights.mostFrequentCustomer.name
                    : '—'}
                </div>
              </div>
            </div>
            {insights.mostFrequentCustomer && (
              <span className="text-[11px] text-stone-400">
                {insights.mostFrequentCustomer.visits} visits
              </span>
            )}
          </div>

          {/* Highest Spender */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Highest Spender
                </div>
                <div className="font-semibold text-stone-900 dark:text-white truncate max-w-[120px]">
                  {insights.highestSpender
                    ? insights.highestSpender.name
                    : '—'}
                </div>
              </div>
            </div>
            <span className="font-bold text-stone-900 dark:text-white">
              {insights.highestSpender
                ? formatINR(insights.highestSpender.amount)
                : '₹0'}
            </span>
          </div>

          {/* New This Month */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  New This Month
                </div>
              </div>
            </div>
            <span className="font-bold text-stone-900 dark:text-white">
              {insights.newThisMonth.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Inactive Customers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <UserMinus className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Inactive Customers
                </div>
              </div>
            </div>
            <span className="font-bold text-stone-900 dark:text-white">
              {insights.inactiveCustomers.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Quick Actions
        </h3>

        <div className="mt-3 space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="flex w-full items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2.5 text-left text-xs font-semibold text-stone-800 transition hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-800 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-200 dark:hover:border-amber-800 dark:hover:bg-amber-950/20"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>{action.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Need Help Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Need Help?
        </h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Our support team is always ready to help you.
        </p>

        <button
          type="button"
          onClick={() => router.push(ROUTES.dashboard.admin.support)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <Headphones className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Contact Support</span>
        </button>
      </div>
    </div>
  );
}
