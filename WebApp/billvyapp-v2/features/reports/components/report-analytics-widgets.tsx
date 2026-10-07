'use client';

import { type ReactNode } from 'react';
import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import { ReportCurrency, useReportMoney } from './report-region';
import type { AnalyticsRow, ReportAnalytics } from '../types/reports.types';

export function CurrencySections({
  data,
  children,
}: {
  data?: ReportAnalytics;
  children: (group: ReportAnalytics) => ReactNode;
}) {
  if (!data) return null;
  const groups = data.currencyGroups ?? [data];
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <ReportCurrency
          key={group.scope.currency ?? 'default'}
          value={group.scope.currency}
        >
          <div className="space-y-4">
            {data.currencyGroups && (
              <h3 className="text-lg font-semibold text-text">
                {group.scope.currency === 'USD'
                  ? 'USD — US dollars'
                  : 'INR — Indian rupees'}
              </h3>
            )}
            {children(group)}
          </div>
        </ReportCurrency>
      ))}
    </div>
  );
}

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
  const formatCurrency = useReportMoney();
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
  const formatCurrency = useReportMoney();
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
