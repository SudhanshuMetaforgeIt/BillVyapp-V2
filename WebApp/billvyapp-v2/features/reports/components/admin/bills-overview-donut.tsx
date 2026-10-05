import type { BillsOverviewSummary } from '../../types/admin-reports.types';
import { AdminReportPanel } from './admin-report-panel';
export function BillsOverviewDonut({
  summary,
}: {
  summary: BillsOverviewSummary;
}) {
  const other = Math.max(
    0,
    summary.total -
      summary.paid -
      summary.pending -
      summary.overdue -
      summary.cancelled,
  );
  const segments = [
    { label: 'Paid', count: summary.paid, color: '#16815d' },
    { label: 'Partially paid', count: summary.pending, color: '#f39b32' },
    { label: 'Unpaid', count: summary.overdue, color: '#d95858' },
    { label: 'Cancelled', count: summary.cancelled, color: '#b5aca0' },
    ...(other
      ? [{ label: 'Other bills', count: other, color: '#6980a2' }]
      : []),
  ];
  const radius = 66,
    circumference = 2 * Math.PI * radius;
  const arcs = segments.map((s, index) => ({
    ...s,
    length: summary.total ? (s.count / summary.total) * circumference : 0,
    offset: summary.total
      ? (-segments.slice(0, index).reduce((n, s) => n + s.count, 0) /
          summary.total) *
        circumference
      : 0,
  }));
  return (
    <AdminReportPanel
      title="Bills overview"
      description="Payment status for the selected period"
      className="h-full"
    >
      <div className="relative mx-auto mb-6 size-44">
        <svg
          viewBox="0 0 160 160"
          className="size-full -rotate-90"
          role="img"
          aria-label={`${summary.total} total bills, ${summary.paid} paid`}
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--color-muted, #f0ece6)"
            strokeWidth="15"
          />
          {arcs
            .filter((a) => a.count > 0)
            .map((a) => (
              <circle
                key={a.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth="15"
                strokeDasharray={`${a.length} ${circumference - a.length}`}
                strokeDashoffset={a.offset}
              >
                <title>
                  {a.label}: {a.count}
                </title>
              </circle>
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-text">
            {summary.total.toLocaleString('en-IN')}
          </span>
          <span className="mt-1 text-xs text-text-secondary">Total bills</span>
        </div>
      </div>
      <div className="space-y-3">
        {segments.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2.5 text-text-secondary">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
            <span className="font-medium tabular-nums text-text">
              {s.count}
              <span className="ml-2 inline-block min-w-10 text-right text-xs font-normal text-text-secondary">
                {summary.total
                  ? Math.round((s.count / summary.total) * 100)
                  : 0}
                %
              </span>
            </span>
          </div>
        ))}
      </div>
      {!summary.total && (
        <p className="mt-4 text-center text-xs text-text-secondary">
          No bills in the selected period.
        </p>
      )}
    </AdminReportPanel>
  );
}
