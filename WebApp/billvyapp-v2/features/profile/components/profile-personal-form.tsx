'use client';

import { useEffect, useState } from 'react';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  normalizePhone,
  splitFullName,
} from '../services/profile.service';
import type { ProfileUser } from '../types/profile.types';
import { useUpdateProfile } from '../hooks/use-profile';

const selectClassName =
  'flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

type ProfilePersonalFormProps = {
  profile?: ProfileUser;
  isLoading?: boolean;
};

export function ProfilePersonalForm({
  profile,
  isLoading,
}: ProfilePersonalFormProps) {
  const update = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [designation, setDesignation] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [timeFormat, setTimeFormat] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFullName(`${profile.firstName} ${profile.lastName}`.trim());
    setEmail(profile.email);
    setPhone(profile.phone ?? '');
    setDesignation(profile.roleLabel);
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <DashboardSectionCard
        title="Personal Information"
        data-dash-animate="section"
        bodyClassName="space-y-4"
      >
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </DashboardSectionCard>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) return;

    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone.length !== 10) {
      return;
    }

    update.mutate({
      userId: profile!.id,
      firstName,
      lastName,
      email: email.trim(),
      phone: trimmedPhone ? normalizePhone(trimmedPhone) : null,
    });
  }

  return (
    <DashboardSectionCard
      title="Personal Information"
      data-dash-animate="section"
      bodyClassName="space-y-5"
    >
      <p className="text-sm text-text-secondary">
        Update your personal information and contact details.
        {profile.role === 'MANAGER'
          ? ' Saving changes may be limited until self-update access is enabled for managers.'
          : null}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="full-name" label="Full Name">
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              className="bg-background"
              required
            />
          </Field>

          <Field id="date-of-birth" label="Date of Birth">
            <Input
              id="date-of-birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="bg-background"
            />
          </Field>

          <Field id="email" label="Email Address">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-background"
              required
            />
          </Field>

          <Field id="designation" label="Designation">
            <Input
              id="designation"
              value={designation}
              readOnly
              className="bg-muted/40"
            />
          </Field>

          <Field id="phone" label="Phone Number">
            <div className="flex gap-2">
              <span className="inline-flex h-11 shrink-0 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-medium text-text-secondary">
                +91
              </span>
              <Input
                id="phone"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                className="bg-background"
                maxLength={10}
              />
            </div>
          </Field>

          <Field id="language" label="Language">
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select language</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </Field>

          <Field id="timezone" label="Timezone">
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select timezone</option>
              <option value="Asia/Kolkata">(GMT +05:30) Asia/Kolkata</option>
              <option value="UTC">(GMT +00:00) UTC</option>
            </select>
          </Field>

          <Field id="time-format" label="Timezone Format">
            <select
              id="time-format"
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select format</option>
              <option value="12">12 Hour (hh:mm AM/PM)</option>
              <option value="24">24 Hour (HH:mm)</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </DashboardSectionCard>
  );
}

function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
