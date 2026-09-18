'use client';

import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';

export function ProfileActivityCard() {
  return (
    <DashboardSectionCard
      title="Account Activity"
      data-dash-animate="section"
      action={
        <button
          type="button"
          onClick={() =>
            toast(
              'Full activity history will be available once the activity API is connected.',
            )
          }
          className="text-sm font-medium text-[#35507a] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          View All Activity
        </button>
      }
      bodyClassName="pt-2"
    >
      <p className="mb-2 text-sm text-text-secondary">
        Review your recent account activity.
      </p>
      <SectionEmptyState
        title="No activity yet"
        message="Recent account events will appear here once activity tracking is connected."
        className="py-8"
      />
    </DashboardSectionCard>
  );
}
