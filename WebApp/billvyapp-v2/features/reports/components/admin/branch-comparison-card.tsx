'use client';
import { useState } from 'react';
import { SelectInput } from '@/components/data/form-fields';
import { Building2 } from 'lucide-react';
import type { BranchComparisonItem } from '../../types/admin-reports.types';
import { AdminReportPanel, reportMoney } from './admin-report-panel';
export function BranchComparisonCard({
  items,
}: {
  items: BranchComparisonItem[];
}) {
  const [metric, setMetric] = useState<'revenue' | 'bills' | 'customers'>(
    'revenue',
  );
  const rows = [...items].sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
  const max = Math.max(...rows.map((b) => b[metric] ?? 0), 1);
  return (
    <AdminReportPanel
      title="Branch performance"
      description="Compare results across your selected branches"
      className="h-full"
      action={
        <SelectInput
          aria-label="Branch comparison metric"
          className="h-9 w-32 text-xs"
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="revenue">Revenue</option>
          <option value="bills">Bills</option>
          <option value="customers">Customers</option>
        </SelectInput>
      }
    >
      {!rows.length ? (
        <p className="py-16 text-center text-sm text-text-secondary">
          No branch activity in this period.
        </p>
      ) : (
        <div className="space-y-5">
          {rows.map((branch, index) => (
            <div key={branch.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-champagne">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 break-words text-sm font-medium text-text">
                    {branch.name}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-text tabular-nums">
                  {metric === 'revenue'
                    ? reportMoney(branch.revenue)
                    : (branch[metric] ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${index === 0 ? 'bg-brand-orange' : 'bg-champagne'}`}
                  style={{
                    width: `${Math.max(0, ((branch[metric] ?? 0) / max) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                {branch.bills ?? 0} completed bills · {branch.customers ?? 0}{' '}
                customers
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminReportPanel>
  );
}
