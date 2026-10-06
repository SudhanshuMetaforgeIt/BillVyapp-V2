'use client';
import dynamic from 'next/dynamic';

import {
  Building2,
  CalendarDays,
  Clock3,
  Globe2,
  Languages,
  Shield,
} from 'lucide-react';

const ProfilePhotoEditor = dynamic(() => import('./profile-photo-editor').then((module) => module.ProfilePhotoEditor), { loading: () => <div role="status" aria-label="Loading profile photo" className="h-52 w-32 animate-pulse rounded-xl bg-surface" /> });
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { profileInitials } from '../services/profile.service';
import type { ProfileUser } from '../types/profile.types';

type ProfileSummaryCardProps = {
  profile?: ProfileUser;
  isLoading?: boolean;
  className?: string;
};

export function ProfileSummaryCard({
  profile,
  isLoading,
  className,
}: ProfileSummaryCardProps) {
  if (isLoading || !profile) {
    return (
      <section
        className={cn(
          'app-surface-card flex flex-col items-center gap-4 p-6',
          className,
        )}
        data-dash-animate="section"
      >
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-6 w-36 rounded-full" />
        <div className="mt-2 w-full space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </section>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = profileInitials(profile.firstName, profile.lastName);

  const rows = [
    {
      icon: CalendarDays,
      label: 'Joined On',
      value: formatDate(profile.createdAt),
    },
    {
      icon: Clock3,
      label: 'Last Login',
      value: formatDateTime(profile.lastLoginAt),
    },
    ...(profile.salonId || profile.salonName
      ? [
          {
            icon: Building2,
            label: 'Salon',
            value: profile.salonName?.trim() || profile.salonId || '—',
          },
        ]
      : []),
    {
      icon: Globe2,
      label: 'Timezone',
      value: profile.timezone?.trim() || '—',
    },
    {
      icon: Languages,
      label: 'Language',
      value: profile.language?.trim() || '—',
    },
    {
      icon: Shield,
      label: 'Role',
      value: profile.roleLabel,
    },
  ];

  return (
    <section
      className={cn(
        'app-surface-card flex flex-col items-center gap-4 p-6 pt-8',
        className,
      )}
      data-dash-animate="section"
    >
      <ProfilePhotoEditor name={fullName} initials={initials} />

      <div className="text-center">
        <p className="text-lg font-semibold text-text">{fullName || '—'}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{profile.email}</p>
      </div>

      <span className="inline-flex rounded-full bg-champagne-light px-3 py-1 text-xs font-semibold text-brand-orange">
        {profile.roleLabel}
      </span>

      <ul className="mt-2 w-full space-y-3 border-t border-border/70 pt-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.label} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-champagne-light text-champagne">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-text-secondary">
                  {row.label}
                </span>
                <span className="break-all font-medium text-text">
                  {row.value}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
