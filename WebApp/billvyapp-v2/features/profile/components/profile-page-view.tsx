'use client';

import { useRef } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useProfile } from '../hooks/use-profile';
import { ProfileActivityCard } from './profile-activity-card';
import { ProfilePasswordForm } from './profile-password-form';
import { ProfilePersonalForm } from './profile-personal-form';
import { ProfileSummaryCard } from './profile-summary-card';

export function ProfilePageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useProfile();

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Profile unavailable"
          message="We could not load your profile. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const isLoading = query.isLoading && !query.data;

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <div className="grid gap-6 xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] xl:gap-7">
        <ProfileSummaryCard profile={query.data} isLoading={isLoading} />
        <ProfilePersonalForm profile={query.data} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2 xl:gap-7">
        <ProfilePasswordForm />
        <ProfileActivityCard />
      </div>
    </div>
  );
}
