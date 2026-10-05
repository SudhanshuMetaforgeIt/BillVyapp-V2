import {
  FileText,
  IndianRupee,
  Scissors,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { AdminReportStats } from '../../types/admin-reports.types';
import { reportMoney } from './admin-report-panel';
export function AdminReportsStats({
  stats,
  loading,
}: {
  stats: AdminReportStats;
  loading?: boolean;
}) {
  const cards = [
    {
      label: 'Total Revenue',
      value: reportMoney(stats.totalRevenue),
      note: 'Collected on completed bills',
      icon: IndianRupee,
      accent: true,
    },
    {
      label: 'Total Bills',
      value: stats.totalBills.toLocaleString('en-IN'),
      note: 'In the selected period',
      icon: FileText,
    },
    {
      label: 'Total Customers',
      value: stats.totalCustomers.toLocaleString('en-IN'),
      note: 'Customers in this scope',
      icon: UserRound,
    },
    {
      label: 'Total Services',
      value: stats.totalServices.toLocaleString('en-IN'),
      note: 'Current service catalogue',
      icon: Scissors,
    },
    {
      label: 'Total Staff',
      value: stats.totalStaff.toLocaleString('en-IN'),
      note: 'Admins, managers and staff',
      icon: UsersRound,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 content-md:grid-cols-3 content-lg:grid-cols-5 sm:gap-4">
      {cards.map(({ label, value, note, icon: Icon, accent }) => (
        <article
          key={label}
          className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${accent ? 'col-span-2 border-brand-orange/25 bg-gradient-to-br from-brand-orange/10 via-surface to-surface content-md:col-span-1' : 'border-border bg-surface'}`}
        >
          <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:gap-2">
            <p className="text-sm font-medium text-text-secondary">{label}</p>
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${accent ? 'bg-brand-orange/10 text-brand-orange' : 'bg-champagne-light text-champagne'}`}
            >
              <Icon className="size-4" aria-hidden />
            </span>
          </div>
          <div className="mt-4 break-words text-3xl font-semibold tracking-tight text-text tabular-nums">
            {loading ? (
              <span className="block h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              value
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {note}
          </p>
        </article>
      ))}
    </div>
  );
}
