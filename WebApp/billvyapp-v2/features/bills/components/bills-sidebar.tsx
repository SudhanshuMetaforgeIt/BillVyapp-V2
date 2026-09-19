'use client';

import {
  ChevronRight,
  Download,
  Plus,
  Receipt,
  Upload,
  Wallet,
} from 'lucide-react';
import type { BillAmountSummary, BillStats } from '../types/bills.types';

type BillsSidebarProps = {
  stats: BillStats;
  amountSummary: BillAmountSummary;
  onCreateBill: () => void;
  onBulkUpload?: () => void;
  onDownloadReports?: () => void;
  onViewPayments?: () => void;
};

export function BillsSidebar({
  stats,
  amountSummary,
  onCreateBill,
  onBulkUpload,
  onDownloadReports,
  onViewPayments,
}: BillsSidebarProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Donut chart calculations
  const total = stats.totalBills;
  const paid = stats.paidBills;
  const pending = stats.pendingBills;
  const overdue = stats.overdueBills;
  // Derive cancelled
  const cancelled = Math.max(0, total - (paid + pending + overdue));

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  // Arc stroke-dasharray and stroke-dashoffset
  const getArcs = () => {
    if (total === 0) {
      return [{ color: '#e7e5e4', strokeDasharray: `${circumference} 0`, offset: 0 }];
    }

    const segments = [
      { count: paid, color: '#22c55e' }, // Emerald/Green
      { count: pending, color: '#f59e0b' }, // Amber
      { count: overdue, color: '#ef4444' }, // Red
      { count: cancelled, color: '#a8a29e' }, // Gray
    ];

    let currentOffset = 0;
    return segments
      .filter((s) => s.count > 0)
      .map((seg) => {
        const strokeLength = (seg.count / total) * circumference;
        const arc = {
          color: seg.color,
          strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
          offset: -currentOffset,
        };
        currentOffset += strokeLength;
        return arc;
      });
  };

  const arcs = getArcs();

  const quickActions = [
    {
      id: 'create-bill',
      label: 'Create New Bill',
      icon: Plus,
      onClick: onCreateBill,
    },
    {
      id: 'bulk-upload',
      label: 'Bulk Upload Bills',
      icon: Upload,
      onClick: onBulkUpload,
    },
    {
      id: 'download-reports',
      label: 'Download Reports',
      icon: Download,
      onClick: onDownloadReports,
    },
    {
      id: 'view-payments',
      label: 'View All Payments',
      icon: Wallet,
      onClick: onViewPayments,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Bills Summary Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Bills Summary
        </h3>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Donut Chart */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="fill-transparent stroke-stone-100 dark:stroke-stone-800"
                strokeWidth="10"
              />
              {/* Segment arcs */}
              {arcs.map((arc, i) => (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={arc.color}
                  strokeWidth="10"
                  strokeDasharray={arc.strokeDasharray}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Inner text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-bold tracking-tight text-stone-900 dark:text-white">
                {total.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-stone-400">Total Bills</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 text-xs flex-1 min-w-[140px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Paid</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {paid.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">({stats.paidBillsPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Pending</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {pending.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">({stats.pendingBillsPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Overdue</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {overdue.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">({stats.overdueBillsPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Cancelled</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {cancelled.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">
                  ({total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Amount Summary Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Amount Summary
        </h3>

        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-600 dark:text-stone-400 font-medium">Total Amount</span>
            <span className="text-sm font-bold text-stone-900 dark:text-white">
              {formatINR(amountSummary.totalAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-600 dark:text-stone-400 font-medium">Paid Amount</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(amountSummary.paidAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-600 dark:text-stone-400 font-medium">Pending Amount</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {formatINR(amountSummary.pendingAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-600 dark:text-stone-400 font-medium">Overdue Amount</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatINR(amountSummary.overdueAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-600 dark:text-stone-400 font-medium">Cancelled Amount</span>
            <span className="font-medium text-stone-400">
              {formatINR(amountSummary.cancelledAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Card */}
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
    </div>
  );
}
