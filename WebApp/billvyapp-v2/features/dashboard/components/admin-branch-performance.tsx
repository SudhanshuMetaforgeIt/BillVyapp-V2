'use client';

import { DashboardSectionCard, SectionEmptyState } from '@/components/layout/section-states';
import { cn } from '@/lib/utils';
import type { AdminBranchPerf } from '../types/admin-dashboard.types';

type AdminBranchPerformanceProps = {
  branches: AdminBranchPerf[];
};

export function AdminBranchPerformance({ branches }: AdminBranchPerformanceProps) {
  return (
    <DashboardSectionCard
      title="Branch Performance"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="space-y-4 p-5"
    >
      <p className="text-xs text-text-secondary">Revenue by branch</p>
      {branches.length === 0 ? (
        <SectionEmptyState message="No branch performance data recorded yet." />
      ) : (
        <ul className="space-y-4">
          {branches.map((branch) => (
            <li key={branch.id}>
              <div className="mb-1.5 flex items-center justify-between gap-4">
                <span className="truncate text-sm font-semibold text-text">{branch.name}</span>
                <span className="shrink-0 text-sm font-bold text-text">
                  ₹{branch.revenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-orange transition-all duration-500"
                  style={{ width: `${branch.percent}%` }}
                  role="progressbar"
                  aria-valuenow={branch.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${branch.name} branch revenue: ${branch.percent}%`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
