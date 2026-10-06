'use client';
import { SelectInput } from '@/components/data/form-fields';
import { SlidersHorizontal } from 'lucide-react';
import { AdminReportExportMenu } from './deferred-report-export-menu';
import type { AdminReportsFilterState } from '../../types/admin-reports.types';
type Props = {
  filters: AdminReportsFilterState;
  onChange: (updated: Partial<AdminReportsFilterState>) => void;
  branches: { id: string; name: string }[];
  onDownloadReport: () => void;
  downloadDisabled: boolean;
  downloadPhase: string;
  downloadError: string | null;
};
export function AdminReportsFilters({
  filters,
  onChange,
  branches,
  onDownloadReport,
  downloadDisabled,
  downloadPhase,
  downloadError,
}: Props) {
  const input =
    'h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-champagne focus:ring-2 focus:ring-champagne/20';
  return (
    <section
      aria-label="Report filters"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-text-secondary">
        <SlidersHorizontal className="size-3.5" aria-hidden />
        REPORT FILTERS
      </div>
      <div className="grid grid-cols-1 items-end gap-4 content-md:grid-cols-2 content-lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,.7fr)_auto]">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-xs font-medium text-text-secondary">
            Date range
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Date from"
              title="Date from"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) =>
                onChange({ dateFrom: e.target.value || undefined })
              }
              className={input}
            />
            <input
              aria-label="Date to"
              title="Date to"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) =>
                onChange({ dateTo: e.target.value || undefined })
              }
              className={input}
            />
          </div>
        </fieldset>
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-medium text-text-secondary">
            Branch
          </span>
          <SelectInput
            aria-label="Report branch"
            className="h-11 w-full min-w-0 text-sm"
            value={filters.branchId}
            onChange={(e) => onChange({ branchId: e.target.value })}
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectInput>
        </label>
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-medium text-text-secondary">
            Report type
          </span>
          <SelectInput
            aria-label="Report type"
            className="h-11 w-full min-w-0 text-sm"
            value={filters.reportType}
            onChange={(e) => onChange({ reportType: e.target.value })}
          >
            <option value="overview">Overview</option>
          </SelectInput>
        </label>
        <AdminReportExportMenu
          onExport={onDownloadReport}
          disabled={downloadDisabled}
          phase={downloadPhase}
          error={downloadError}
        />
      </div>
    </section>
  );
}
