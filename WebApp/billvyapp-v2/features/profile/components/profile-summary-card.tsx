'use client';

import {
  CalendarDays,
  Camera,
  Clock3,
  Globe2,
  Languages,
  Shield,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

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
    {
      icon: Globe2,
      label: 'Timezone',
      value: '—',
    },
    {
      icon: Languages,
      label: 'Language',
      value: '—',
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
      <div className="relative">
        <div className="flex size-28 items-center justify-center overflow-hidden rounded-full bg-champagne-light text-2xl font-semibold text-brand-orange ring-4 ring-champagne/20">
          {profile.profilePhoto ? (
            <Image
              src={profile.profilePhoto}
              alt={fullName}
              width={112}
              height={112}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <span aria-hidden>
              {initials ? initials : <UserRound className="size-10" />}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            toast('Photo upload will be available once media API is connected.')
          }
          className="absolute right-1 bottom-1 inline-flex size-8 items-center justify-center rounded-full bg-brand-orange text-white shadow-md transition hover:bg-brand-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          aria-label="Change profile photo"
        >
          <Camera className="size-3.5" aria-hidden />
        </button>
      </div>

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
                <span className="font-medium text-text">{row.value}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
