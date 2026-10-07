'use client';

import { useEffect, useState } from 'react';

import { MutationError } from '@/components/data/form-fields';
import { DashboardSectionCard } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { can } from '@/lib/capabilities';
import { cn } from '@/lib/utils';
import { isValidPhoneInput } from '@/lib/phone';
import { normalizePhone, splitFullName } from '../services/profile.service';
import type { ProfileUser } from '../types/profile.types';
import { useUpdateProfile } from '../hooks/use-profile';

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

  useEffect(() => {
    if (!profile) return;
    setFullName(`${profile.firstName} ${profile.lastName}`.trim());
    setEmail(profile.email);
    setPhone(profile.phone ?? '');
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <DashboardSectionCard
        title="Personal Information"
        data-dash-animate="section"
        bodyClassName="space-y-4"
      >
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 panel-md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </DashboardSectionCard>
    );
  }

  // The API has no self-service profile update; only user administrators
  // may PATCH /users/:id.
  const editable = can(profile, 'users.write');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) return;

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhoneInput(trimmedPhone)) return;

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
        {editable
          ? 'Update your personal information and contact details.'
          : 'Contact your administrator to change these details.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset
          disabled={!editable}
          className="grid gap-4 panel-md:grid-cols-2"
        >
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

          <Field id="designation" label="Role">
            <Input
              id="designation"
              value={profile.roleLabel}
              readOnly
              className="bg-muted/40"
            />
          </Field>

          <Field id="phone" label="Phone Number">
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10 local digits"
              className="bg-background"
              maxLength={16}
            />
          </Field>
        </fieldset>

        <MutationError error={update.error} />

        {editable ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        ) : null}
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
