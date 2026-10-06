'use client';
import { Menu } from '@base-ui/react/menu';
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react';

export function AdminReportExportMenu({
  onExport,
  disabled,
  phase,
  error,
  initialOpen = false,
}: {
  onExport: () => void;
  disabled: boolean;
  phase: string;
  error: string | null;
  initialOpen?: boolean;
}) {
  return (
    <div className="min-w-0 max-w-full">
      <Menu.Root defaultOpen={initialOpen}>
        <Menu.Trigger
          autoFocus={initialOpen}
          disabled={disabled}
          className="flex min-h-11 w-full max-w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
        >
          <Download className="size-3.5 shrink-0" aria-hidden />
          <span>{phase || 'Download Report'}</span>
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="z-[300]">
            <Menu.Popup
              className="w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-surface p-1 shadow-lg outline-none"
              aria-label="Download report formats"
            >
              <Menu.Item
                onClick={onExport}
                disabled={disabled}
                className="flex cursor-pointer items-start gap-2 rounded-lg p-3 text-sm text-text outline-none data-highlighted:bg-champagne-light"
              >
                <FileSpreadsheet
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span>
                  <span className="block font-semibold">Excel (.xlsx)</span>
                  <span className="block text-xs text-text-secondary">
                    Generate and download Excel report
                  </span>
                </span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <p role="status" aria-live="polite" className="sr-only">
        {phase}
      </p>
      {error && (
        <p role="alert" className="mt-2 max-w-64 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
