import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { ROLE_LABELS, ROLE_SEGMENTS, type RoleCode } from '@/constants/roles';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const SEGMENT_TO_ROLE = Object.fromEntries(
  (Object.entries(ROLE_SEGMENTS) as [RoleCode, string][]).map(
    ([role, segment]) => [segment, role],
  ),
) as Record<string, RoleCode>;

type DashboardPageProps = {
  params: Promise<{ role: string }>;
};

/**
 * Placeholder landing for roles that do not yet have a dedicated dashboard.
 * Super Admin is served by app/dashboard/super_admin.
 */
export default async function RoleDashboardPage({ params }: DashboardPageProps) {
  const { role: segment } = await params;
  const role = SEGMENT_TO_ROLE[segment];

  if (!role || role === 'SUPER_ADMIN') notFound();

  return (
    <AppShell
      requiredRole={role}
      title={`${ROLE_LABELS[role]} Dashboard`}
      subtitle="Your role workspace will be available here next."
    >
      <div className="app-surface-card mx-auto max-w-lg p-8 text-center">
        <p className="text-sm font-medium text-champagne">Coming soon</p>
        <h2 className="mt-2 text-xl font-semibold text-text">
          {ROLE_LABELS[role]} experience
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Authentication is working. The full {ROLE_LABELS[role].toLowerCase()}{' '}
          dashboard will be built in a later phase.
        </p>
      </div>
    </AppShell>
  );
}
