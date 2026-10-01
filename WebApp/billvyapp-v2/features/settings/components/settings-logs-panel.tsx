'use client';

import { useState } from 'react';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useSettingsLogs } from '../hooks/use-platform-settings';

export function SettingsLogsPanel() {
  const [page, setPage] = useState(1);
  const query = useSettingsLogs(page);

  if (query.isLoading && !query.data) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (query.isError && !query.data) {
    return (
      <DashboardSectionCard title="System logs">
        <SectionErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </DashboardSectionCard>
    );
  }

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <DashboardSectionCard title="System logs" bodyClassName="space-y-4">
      {rows.length === 0 ? (
        <SectionEmptyState message="No system log entries yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-text-secondary">
              <tr>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Action</th>
                <th className="py-2 pr-3 font-medium">Entity</th>
                <th className="py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/70">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="py-2 pr-3 font-medium">{row.action}</td>
                  <td className="py-2 pr-3">{row.entityType}</td>
                  <td className="py-2 text-text-secondary">{row.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </DashboardSectionCard>
  );
}
