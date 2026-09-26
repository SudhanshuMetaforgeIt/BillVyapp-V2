'use client';

import { QueryErrorState } from '@/components/data/query-error-state';
import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { listAuditLogs } from '@/features/audit/services/audit.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { can } from '@/lib/capabilities';
import { formatDateTime } from '@/lib/format';

/** Recent audit entries recorded against the signed-in user. */
export function ProfileActivityCard() {
  const user = useCurrentUser();
  const activity = useScopedQuery(
    ['audit', 'self', user?.id],
    () => listAuditLogs({ page: 1, limit: 6, userId: user?.id }),
    { capability: 'audit.read', enabled: Boolean(user?.id) },
  );

  if (!can(user, 'audit.read')) return null;

  return (
    <DashboardSectionCard title="Account Activity" data-dash-animate="section" bodyClassName="pt-2">
      <p className="mb-2 text-sm text-text-secondary">Your most recent recorded actions.</p>
      {activity.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : activity.isError && !activity.data ? (
        <QueryErrorState error={activity.error} onRetry={() => void activity.refetch()} className="py-6" />
      ) : (activity.data?.data ?? []).length === 0 ? (
        <SectionEmptyState title="No activity yet" message="Actions you take will be listed here." className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {activity.data?.data.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-medium text-text">
                {entry.action.replaceAll('_', ' ').toLowerCase()} · {entry.entityType.toLowerCase()}
              </span>
              <span className="shrink-0 text-xs text-text-secondary">{formatDateTime(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
