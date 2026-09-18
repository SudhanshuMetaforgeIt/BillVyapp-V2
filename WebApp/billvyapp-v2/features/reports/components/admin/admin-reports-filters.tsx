'use client';

import { Calendar, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminReportsFilterState } from '../../types/admin-reports.types';

type AdminReportsFiltersProps = {
  filters: AdminReportsFilterState;
  onChange: (updated: Partial<AdminReportsFilterState>) => void;
  branches: { id: string; name: string }[];
  onDownloadReport: () => void;
};

export function AdminReportsFilters({
  filters,
  onChange,
  branches,
  onDownloadReport,
}: AdminReportsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {/* Left filter inputs */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range */}
        <div>
          <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
            Date Range
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-2xs dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
            <Calendar className="h-3.5 w-3.5 text-stone-400" />
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
              className="border-none bg-transparent p-0 text-xs focus:outline-hidden"
              title="Date from"
            />
            <span className="text-stone-400">—</span>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
              className="border-none bg-transparent p-0 text-xs focus:outline-hidden"
              title="Date to"
            />
          </div>
        </div>

        {/* Branch */}
        <div>
          <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
            Branch
          </label>
          <div className="relative">
            <select
              value={filters.branchId}
              onChange={(e) => onChange({ branchId: e.target.value })}
              className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none min-w-[150px]"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          </div>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
            Report Type
          </label>
          <div className="relative">
            <select
              value={filters.reportType}
              onChange={(e) => onChange({ reportType: e.target.value })}
              className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none min-w-[140px]"
            >
              <option value="overview">Overview</option>
              <option value="sales">Sales Report</option>
              <option value="staff">Staff Report</option>
              <option value="customers">Customers Report</option>
              <option value="services">Services Report</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          </div>
        </div>
      </div>

      {/* Right Download Button */}
      <div>
        <Button
          type="button"
          onClick={onDownloadReport}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-xs text-xs font-semibold h-9 px-4 rounded-lg"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Report</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
      </div>
    </div>
  );
}
