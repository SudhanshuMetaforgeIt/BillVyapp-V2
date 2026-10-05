'use client';
import { SelectInput } from '@/components/data/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionErrorState } from '@/components/layout/section-states';
import {
  REPORT_PRESETS,
  reportDateRange,
} from '../services/report-date-ranges';
import type {
  AnalyticsParams,
  ReportFilterOptions,
} from '../types/reports.types';
export function ReportsFilters({
  params,
  onChange,
  preset,
  onPreset,
  options,
  loading,
  error,
  retry,
  onGenerate,
}: {
  params: AnalyticsParams;
  onChange: (params: AnalyticsParams) => void;
  preset: string;
  onPreset: (preset: string) => void;
  options?: ReportFilterOptions;
  loading: boolean;
  error: boolean;
  retry: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="app-surface-card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2 content-lg:grid-cols-5">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Date range
          <SelectInput
            className="h-11 w-full"
            aria-label="Date range preset"
            value={preset}
            onChange={(e) => {
              onPreset(e.target.value);
              if (e.target.value !== 'Custom Range')
                onChange({ ...params, ...reportDateRange(e.target.value) });
            }}
          >
            {REPORT_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectInput>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          From
          <Input
            type="date"
            aria-label="Date from"
            value={params.dateFrom}
            onChange={(e) => {
              onPreset('Custom Range');
              onChange({ ...params, dateFrom: e.target.value });
            }}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          To
          <Input
            type="date"
            aria-label="Date to"
            value={params.dateTo}
            onChange={(e) => {
              onPreset('Custom Range');
              onChange({ ...params, dateTo: e.target.value });
            }}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Franchise
          <SelectInput
            className="h-11 w-full"
            aria-label="Filter by franchise"
            value={params.franchiseId}
            disabled={loading || error}
            onChange={(e) =>
              onChange({
                ...params,
                franchiseId: e.target.value,
                salonId: 'all',
              })
            }
          >
            <option value="all">All Franchises</option>
            {options?.franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectInput>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Salon
          <SelectInput
            className="h-11 w-full"
            aria-label="Filter by salon"
            value={params.salonId}
            disabled={loading || error}
            onChange={(e) => onChange({ ...params, salonId: e.target.value })}
          >
            <option value="all">All Salons</option>
            {options?.salons
              .filter(
                (s) =>
                  params.franchiseId === 'all' ||
                  s.franchiseId === params.franchiseId,
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </SelectInput>
        </label>
      </div>
      {error && (
        <SectionErrorState
          message="Reporting filter options could not be loaded."
          onRetry={retry}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {params.dateFrom} – {params.dateTo} ·{' '}
          {options?.franchises.find((f) => f.id === params.franchiseId)?.name ??
            (params.franchiseId === 'all'
              ? 'All Franchises'
              : 'Selected franchise')}{' '}
          ·{' '}
          {options?.salons.find((s) => s.id === params.salonId)?.name ??
            (params.salonId === 'all' ? 'All Salons' : 'Selected salon')}
        </p>
        <Button
          onClick={onGenerate}
          disabled={
            !params.dateFrom ||
            !params.dateTo ||
            params.dateFrom > params.dateTo
          }
          className="bg-brand-orange text-white"
        >
          Generate Report
        </Button>
      </div>
      {(!params.dateFrom ||
        !params.dateTo ||
        params.dateFrom > params.dateTo) && (
        <p role="alert" className="text-sm text-danger">
          Select a valid start and end date.
        </p>
      )}
    </div>
  );
}
