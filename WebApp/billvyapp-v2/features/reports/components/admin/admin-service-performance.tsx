'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type {
  TopServiceByRevenueItem,
  TopServiceByQuantityItem,
} from '../../types/admin-reports.types';
import { AdminReportPanel, reportMoney } from './admin-report-panel';
export function AdminServicePerformance({
  revenue,
  quantity,
}: {
  revenue: TopServiceByRevenueItem[];
  quantity: TopServiceByQuantityItem[];
}) {
  const [metric, setMetric] = useState<'revenue' | 'quantity'>('revenue');
  const rows =
    metric === 'revenue'
      ? revenue.map((r) => ({ ...r, value: r.revenue }))
      : quantity.map((r) => ({ ...r, value: r.quantity }));
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <AdminReportPanel
      title="Top services"
      description="Your five leading services in the selected period"
      className="h-full"
      action={
        <div
          className="flex rounded-lg bg-muted p-1"
          aria-label="Service ranking"
        >
          <button
            type="button"
            aria-pressed={metric === 'revenue'}
            onClick={() => setMetric('revenue')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${metric === 'revenue' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary'}`}
          >
            Revenue
          </button>
          <button
            type="button"
            aria-pressed={metric === 'quantity'}
            onClick={() => setMetric('quantity')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${metric === 'quantity' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary'}`}
          >
            Quantity
          </button>
        </div>
      }
    >
      {!rows.length ? (
        <p className="py-16 text-center text-sm text-text-secondary">
          No service usage data yet.
        </p>
      ) : (
        <ol className="space-y-5">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-start gap-3">
              <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-text-secondary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                  <span className="min-w-0 break-words font-medium text-text">
                    {row.name}
                  </span>
                  <span className="font-semibold tabular-nums text-text">
                    {metric === 'revenue'
                      ? reportMoney(row.value)
                      : `${row.value.toLocaleString('en-IN')} sold`}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-champagne"
                    style={{ width: `${(row.value / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Link
        href="/dashboard/admin/services"
        className="mt-6 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-text-secondary transition hover:border-champagne hover:text-text"
      >
        View all services
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </AdminReportPanel>
  );
}
