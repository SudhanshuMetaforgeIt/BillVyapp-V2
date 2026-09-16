import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ROLE_LABELS, ROLE_SEGMENTS, type RoleCode } from '@/constants/roles';
import { ROUTES } from '@/constants/routes';

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
 * Minimal post-login landing so authentication redirects resolve.
 * Full dashboard UI will replace this later.
 */
export default async function RoleDashboardPage({ params }: DashboardPageProps) {
  const { role: segment } = await params;
  const role = SEGMENT_TO_ROLE[segment];

  if (!role) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-[#FF6A00]">Signed in</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          {ROLE_LABELS[role]} Dashboard
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Authentication succeeded. The full dashboard for this role will be
          built next.
        </p>
        <a
          href={ROUTES.auth.login}
          className="mt-6 inline-block text-sm font-medium text-neutral-600 underline-offset-4 hover:underline"
        >
          Back to login
        </a>
      </div>
    </main>
  );
}
