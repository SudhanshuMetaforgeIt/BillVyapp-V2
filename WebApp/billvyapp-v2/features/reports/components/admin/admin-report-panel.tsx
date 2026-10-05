import type { ReactNode } from 'react';
export const reportMoney = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
export const reportDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
export function AdminReportPanel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-border bg-surface shadow-[0_3px_16px_rgb(40_30_15_/0.035)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-text">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
