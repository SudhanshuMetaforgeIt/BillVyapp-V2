'use client';

import React from 'react';
import { useProfile } from '../../hooks/use-profile';
import { AdminProfileOverviewCard } from './admin-profile-overview-card';
import { AdminProfilePersonalCard } from './admin-profile-personal-card';
import { AdminProfilePasswordCard } from './admin-profile-password-card';

export function AdminProfilePageView() {
  const { data: profile } = useProfile();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Profile
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Manage your personal information and account settings.
        </p>
      </div>

      {/* 2-Column Responsive Layout matching Figma */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 xl:col-span-4">
          <AdminProfileOverviewCard profile={profile} />
        </div>

        {/* Right Column: Personal Information & Change Password */}
        <div className="space-y-6 lg:col-span-8 xl:col-span-8">
          <AdminProfilePersonalCard profile={profile} />
          <AdminProfilePasswordCard />
        </div>
      </div>
    </div>
  );
}
