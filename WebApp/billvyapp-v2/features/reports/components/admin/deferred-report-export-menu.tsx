'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Download } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { AdminReportExportMenu as ExportMenu } from './admin-report-export-menu';

const Menu = dynamic(() => import('./admin-report-export-menu').then((module) => module.AdminReportExportMenu), {
  loading: () => <button disabled className="min-h-11 w-full rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white" role="status">Opening export options…</button>,
});

export function AdminReportExportMenu(props: ComponentProps<typeof ExportMenu>) {
  const [activated, setActivated] = useState(false);
  if (activated) return <Menu {...props} initialOpen />;
  return <button type="button" disabled={props.disabled} aria-haspopup="menu" aria-expanded={false}
    onClick={() => setActivated(true)}
    onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActivated(true);
      }
    }}
    className="flex min-h-11 w-full max-w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60">
    <Download className="size-3.5 shrink-0" aria-hidden />
    <span>{props.phase || 'Download Report'}</span>
    <ChevronDown className="size-3.5 shrink-0" aria-hidden />
  </button>;
}
