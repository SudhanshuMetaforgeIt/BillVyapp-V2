'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { AnalyticsRow, ReportAnalytics } from '../types/reports.types';

export function AnalyticsState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="app-surface-card space-y-3 p-5">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (error)
    return (
      <div className="app-surface-card">
        <SectionErrorState
          message="This analytics section could not be loaded."
          onRetry={retry}
        />
      </div>
    );
  return children;
}
export function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4" aria-label={title}>
      <div>
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}
export function SummaryCards({
  metrics,
  range,
}: {
  metrics: NonNullable<ReportAnalytics['summary']>;
  range: string;
}) {
  const paymentData = metrics.totalPayments > 0;
  const cards = [
    [
      'Total Revenue',
      paymentData ? formatCurrency(Number(metrics.totalRevenue)) : 'No data',
      'Successful payments',
    ],
    [
      'Total Transactions',
      paymentData ? formatNumber(metrics.totalPayments) : 'No data',
      'Payment attempts',
    ],
    ['Total Users', formatNumber(metrics.userCount), 'Population at range end'],
    [
      'Total Businesses',
      formatNumber(metrics.franchiseCount),
      'Population at range end',
    ],
    [
      'Total Customers',
      formatNumber(metrics.customerCount),
      'Population at range end',
    ],
    [
      'Total Salons',
      formatNumber(metrics.salonCount),
      'Population at range end',
    ],
    [
      'Successful Payments',
      paymentData ? formatNumber(metrics.successfulPayments) : 'No data',
      'Current successful status',
    ],
    [
      'Failed Payments',
      paymentData ? formatNumber(metrics.failedPayments) : 'No data',
      'Current failed status',
    ],
    [
      'Payment Success Rate',
      metrics.paymentSuccessRate === null
        ? 'No data'
        : `${metrics.paymentSuccessRate.toFixed(1)}%`,
      'Successful / all attempts',
    ],
    [
      'Average Transaction Value',
      metrics.averageTransactionValue === null
        ? 'No data'
        : formatCurrency(metrics.averageTransactionValue),
      'Per successful payment',
    ],
  ];
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
      {cards.map(([label, value, note]) => (
        <article
          key={label}
          className="app-surface-card app-metric-card space-y-2 p-5"
        >
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="app-metric-value font-bold text-text">{value}</p>
          <p className="text-xs text-text-secondary">
            {note}
            <br />
            {range}
          </p>
        </article>
      ))}
    </div>
  );
}
export type AnalyticsColumn = {
  key: string;
  label: string;
  money?: boolean;
  render?: (row: AnalyticsRow) => ReactNode;
};
export function AnalyticsTable({
  title,
  data,
  columns,
  empty = 'No data for the selected period and scope.',
}: {
  title: string;
  data: AnalyticsRow[];
  columns: AnalyticsColumn[];
  empty?: string;
}) {
  const value = (row: AnalyticsRow, column: AnalyticsColumn) =>
    column.render
      ? column.render(row)
      : row[column.key] == null
        ? 'No data'
        : column.money
          ? formatCurrency(Number(row[column.key]))
          : String(row[column.key]);
  return (
    <div className="app-panel app-surface-card min-w-0">
      <h3 className="border-b border-border px-5 py-4 font-semibold text-text">
        {title}
      </h3>
      {data.length === 0 ? (
        <SectionEmptyState title="No data" message={empty} />
      ) : (
        <>
          <div className="app-report-table relative">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-ivory/80 text-xs uppercase text-text-secondary">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-3 font-semibold">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={String(row.id ?? i)}
                    className="border-t border-border"
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className="px-3 py-3 align-top [overflow-wrap:anywhere]"
                      >
                        {value(row, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="app-report-cards divide-y divide-border">
            {data.map((row, i) => (
              <li key={String(row.id ?? i)} className="p-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {columns.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-xs text-text-secondary">{c.label}</dt>
                      <dd className="text-sm [overflow-wrap:anywhere]">
                        {value(row, c)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
export function RevenueTrend({ data }: { data: AnalyticsRow[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(180, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...data.map((r) => Number(r.revenue)));
  return (
    <div ref={chartRef} className="app-surface-card p-5">
      <h3 className="font-semibold">Revenue trend</h3>
      {data.length === 0 ? (
        <SectionEmptyState
          title="No revenue data"
          message="No successful payments for the selected period."
        />
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} 240`}
            role="img"
            aria-label="Successful payment revenue by period"
            className="mt-4 w-full"
          >
            <title>
              Revenue trend; each bar includes its revenue, transactions and
              average transaction value.
            </title>
            {[0, 0.5, 1].map((r) => (
              <g key={r}>
                <line
                  x1="72"
                  x2={width - 8}
                  y1={210 - r * 180}
                  y2={210 - r * 180}
                  stroke="var(--bv-border)"
                />
                <text
                  x="66"
                  y={214 - r * 180}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--bv-text-secondary)"
                >
                  {formatCurrency(max * r)}
                </text>
              </g>
            ))}
            {data.map((r, i) => {
              const step = (width - 84) / data.length,
                h = (Number(r.revenue) / max) * 180;
              return (
                <g key={String(r.period)}>
                  <rect
                    tabIndex={0}
                    x={76 + i * step}
                    y={210 - h}
                    width={Math.max(1, step * 0.7)}
                    height={Math.max(h, 1)}
                    rx="3"
                    fill="var(--bv-champagne)"
                  >
                    <title>{`${r.period}: ${formatCurrency(Number(r.revenue))}; ${r.transactions} successful payments; average ${formatCurrency(Number(r.averageTransaction))}`}</title>
                  </rect>
                  {(data.length <= Math.max(1, Math.floor((width - 84) / 90)) ||
                    i %
                      Math.ceil(
                        data.length /
                          Math.max(1, Math.floor((width - 84) / 90)),
                      ) ===
                      0) && (
                    <text
                      x={76 + (i + 0.35) * step}
                      y="232"
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--bv-text-secondary)"
                    >
                      {String(r.period).slice(0, 10)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-text-secondary">
              View accessible chart data
            </summary>
            <AnalyticsTable
              title="Revenue periods"
              data={data}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'revenue', label: 'Revenue', money: true },
                { key: 'transactions', label: 'Successful payments' },
                {
                  key: 'averageTransaction',
                  label: 'Average transaction',
                  money: true,
                },
              ]}
            />
          </details>
        </>
      )}
    </div>
  );
}
export function RevenueBars({
  title,
  data,
  label,
  limit = 5,
}: {
  title: string;
  data: AnalyticsRow[];
  label: string;
  limit?: number;
}) {
  const max = Math.max(1, ...data.map((r) => Number(r.revenue)));
  return (
    <div className="app-surface-card p-5">
      <h3 className="font-semibold">{title}</h3>
      {data.length === 0 ? (
        <SectionEmptyState
          title="No data"
          message="No revenue records for the selected period."
        />
      ) : (
        <ul className="mt-4 space-y-4">
          {data.slice(0, limit).map((r, i) => (
            <li key={String(r.id ?? i)}>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {r[label]}
                </span>
                <span>{formatCurrency(Number(r.revenue))}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-champagne-light">
                <div
                  className="h-2 rounded-full bg-champagne"
                  style={{ width: `${(Number(r.revenue) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
