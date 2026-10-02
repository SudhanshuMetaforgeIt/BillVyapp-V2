'use client';

import React from 'react';
import { Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { ProfilePhotoEditor } from '../profile-photo-editor';
import type { ProfileUser } from '../../types/profile.types';

type Props = {
  profile?: ProfileUser;
};

export function AdminProfileOverviewCard({ profile }: Props) {
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Rohit Sharma';
  const roleLabel = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? 'Admin' : profile?.roleLabel || 'Admin';
  const email = profile?.email || 'rohit@starrkuts.com';
  const phone = profile?.phone || '+91 98765 43210';

  const formatJoinDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Jan 12, 2024';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Jan 12, 2024';
    }
  };

  return (
    <div className="flex flex-col items-center rounded-2xl border border-stone-200/90 bg-white p-7 text-center shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 mt-2"><ProfilePhotoEditor name={fullName} /></div>

      {/* User Name & Role */}
      <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
        {fullName}
      </h2>
      <p className="mt-0.5 text-xs font-semibold text-amber-500">
        {roleLabel}
      </p>

      {/* Contact & Meta details list */}
      <div className="mt-7 w-full space-y-4 text-left text-xs">
        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <Mail className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span className="truncate">{email}</span>
        </div>

        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <Phone className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span>{phone}</span>
        </div>

        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <Calendar className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span>Joined on {formatJoinDate(profile?.createdAt)}</span>
        </div>

        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <MapPin className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span>Bangalore, Karnataka, India</span>
        </div>
      </div>

    </div>
  );
}
