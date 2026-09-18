'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  FranchiseOption,
  ReportTypeFilter,
} from '../types/reports.types';

type ReportsFiltersProps = {
  dateFrom: string;
  dateTo: string;
  franchiseId: string;
  reportType: ReportTypeFilter;
  franchises: FranchiseOption[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onFranchiseChange: (value: string) => void;
  onReportTypeChange: (value: ReportTypeFilter) => void;
  onGenerate: () => void;
  className?: string;
};

const selectClassName =
  'h-11 rounded-lg border border-border bg-background px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne';

export function ReportsFilters({
  dateFrom,
  dateTo,
  franchiseId,
  reportType,
  franchises,
  onDateFromChange,
  onDateToChange,
  onFranchiseChange,
  onReportTypeChange,
  onGenerate,
  className,
}: ReportsFiltersProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            aria-label="Date from"
            className="h-11 w-auto bg-background"
          />
          <span className="text-xs text-text-secondary">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            aria-label="Date to"
            className="h-11 w-auto bg-background"
          />
        </div>

        <select
          value={franchiseId}
          onChange={(e) => onFranchiseChange(e.target.value)}
          aria-label="Filter by business"
          className={selectClassName}
        >
          <option value="all">All Businesses</option>
          {franchises.map((franchise) => (
            <option key={franchise.id} value={franchise.id}>
              {franchise.name}
            </option>
          ))}
        </select>

        <select
          value={reportType}
          onChange={(e) =>
            onReportTypeChange(e.target.value as ReportTypeFilter)
          }
          aria-label="Filter by report type"
          className={selectClassName}
        >
          <option value="all">All Report Types</option>
          <option value="financial">Financial</option>
          <option value="business">Business</option>
          <option value="user">User</option>
          <option value="transaction">Transaction</option>
          <option value="subscription">Subscription</option>
          <option value="activity">Activity</option>
        </select>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onGenerate}
        className="h-11 bg-brand-orange text-white hover:bg-brand-orange-deep focus-visible:ring-brand-orange"
      >
        Generate Report
      </Button>
    </div>
  );
}
