'use client';
import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';
import { SelectInput } from '@/components/data/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/format';
import {
  useGenerateReport,
  useDownloadReport,
} from '../hooks/use-report-mutations';
import {
  AnalyticsTable,
  CurrencySections,
  SummaryCards,
} from './report-analytics-widgets';
import type {
  AnalyticsParams,
  ReportFilterOptions,
  ReportListRow,
  ReportType,
  ReportAnalytics,
} from '../types/reports.types';
import { REPORT_TYPES } from '../types/report-options';
export function ReportDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup
          aria-label={title}
          className="app-dialog app-surface-card fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="outline" aria-label="Close" onClick={close}>
              Close
            </Button>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function GenerateReportDialog({
  params,
  options,
  close,
  apply,
}: {
  params: AnalyticsParams;
  options?: ReportFilterOptions;
  close: () => void;
  apply: (params: AnalyticsParams) => void;
}) {
  const [config, setConfig] = useState(params);
  const [type, setType] = useState<ReportType>('financial');
  const generate = useGenerateReport();
  const valid = Boolean(
    config.dateFrom && config.dateTo && config.dateFrom <= config.dateTo,
  );
  return (
    <ReportDialog
      title="Generate Report"
      close={() => {
        if (!generate.isPending) close();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          apply(config);
          generate.mutate({
            type,
            format: 'excel',
            dateFrom: config.dateFrom,
            dateTo: config.dateTo,
            interval: config.interval,
            salonSort: config.salonSort,
            serviceSort: config.serviceSort,
            ...(config.franchiseId !== 'all'
              ? { franchiseId: config.franchiseId }
              : {}),
            ...(config.salonId !== 'all' ? { salonId: config.salonId } : {}),
          });
        }}
      >
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          Report type
          <SelectInput
            className="h-11 w-full"
            aria-label="Report type"
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectInput>
        </label>
        <div className="grid gap-3 panel-md:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            From
            <Input
              type="date"
              aria-label="Report date from"
              value={config.dateFrom}
              onChange={(e) =>
                setConfig({ ...config, dateFrom: e.target.value })
              }
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            To
            <Input
              type="date"
              aria-label="Report date to"
              value={config.dateTo}
              onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            Franchise
            <SelectInput
              className="h-11 w-full"
              aria-label="Report franchise"
              value={config.franchiseId}
              disabled={!options}
              onChange={(e) =>
                setConfig({
                  ...config,
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
          <label className="min-w-0 space-y-1 text-sm">
            Salon
            <SelectInput
              className="h-11 w-full"
              aria-label="Report salon"
              value={config.salonId}
              disabled={!options}
              onChange={(e) =>
                setConfig({ ...config, salonId: e.target.value })
              }
            >
              <option value="all">All Salons</option>
              {options?.salons
                .filter(
                  (s) =>
                    config.franchiseId === 'all' ||
                    s.franchiseId === config.franchiseId,
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </SelectInput>
          </label>
        </div>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          Format
          <SelectInput value="excel" aria-label="Report format">
            <option value="excel">Excel (.xlsx)</option>
          </SelectInput>
        </label>
        <p className="text-sm text-text-secondary">
          The dashboard will use this same range and scope. Exports preserve the
          original summary fields and include captured analytics. Subscription
          exports include the existing platform metrics; subscription-specific
          income is not inferred.
        </p>
        <p role="status" className="text-sm">
          {generate.isPending
            ? 'Generating…'
            : generate.isSuccess
              ? 'Generated'
              : generate.isError
                ? 'Failed: ' + generate.error.message
                : ''}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={generate.isPending}
            onClick={close}
            type="button"
          >
            Done
          </Button>
          <Button
            disabled={!valid || generate.isPending}
            type="submit"
            className="bg-brand-orange text-white"
          >
            {generate.isPending ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </form>
    </ReportDialog>
  );
}
export function ReportPreview({
  report,
  close,
}: {
  report: ReportListRow;
  close: () => void;
}) {
  const download = useDownloadReport();
  const metrics = report.snapshot.metrics;
  const analytics = report.snapshot.analytics as ReportAnalytics | undefined;
  const values =
    metrics && typeof metrics === 'object'
      ? Object.entries(metrics).map(([metric, value]) => ({
          metric,
          value: typeof value === 'number' ? value : String(value ?? 'No data'),
        }))
      : [];
  return (
    <ReportDialog title="Report preview" close={close}>
      <p className="font-semibold [overflow-wrap:anywhere]">{report.name}</p>
      <dl className="grid gap-3 text-sm panel-md:grid-cols-2">
        {[
          ['Type', report.typeLabel],
          ['Date range', report.dateRangeLabel],
          [
            'Scope',
            [
              report.franchiseName ?? 'All Franchises',
              report.salonName ?? 'All Salons',
            ].join(' · '),
          ],
          ['Generated by', report.generatedBy],
          ['Generated on', formatDateTime(report.generatedOn)],
          ['Format', 'Excel (.xlsx)'],
          ['Status', 'Generated'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-text-secondary">{label}</dt>
            <dd className="[overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
      {analytics?.currencyGroups ? (
        <CurrencySections data={analytics}>
          {(group) =>
            group.summary ? (
              <SummaryCards
                metrics={group.summary}
                range={report.dateRangeLabel}
              />
            ) : null
          }
        </CurrencySections>
      ) : (
        <AnalyticsTable
          title="Captured summary"
          data={values}
          columns={[
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ]}
          empty="This older report has no captured summary."
        />
      )}
      <Button
        disabled={download.isPending}
        onClick={() => download.mutate({ id: report.id, name: report.name })}
      >
        Download
      </Button>
    </ReportDialog>
  );
}
