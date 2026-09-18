'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROLE_LABELS, type RoleCode } from '@/constants/roles';
import { useCreateUser } from '../hooks/use-create-user';
import { fetchSalonsForFranchise } from '../services/users.service';
import type {
  FranchiseOption,
  RoleOption,
  SalonOption,
} from '../types/users.types';

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
  franchises: FranchiseOption[];
};

function roleNeedsFranchise(code: RoleCode | null): boolean {
  return code === 'ADMIN' || code === 'MANAGER' || code === 'STAFF';
}

function roleNeedsSalon(code: RoleCode | null): boolean {
  return code === 'MANAGER' || code === 'STAFF';
}

export function CreateUserDialog({
  open,
  onOpenChange,
  roles,
  franchises,
}: CreateUserDialogProps) {
  const titleId = useId();
  const [roleId, setRoleId] = useState('');
  const [franchiseId, setFranchiseId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [salons, setSalons] = useState<SalonOption[]>([]);
  const [salonsLoading, setSalonsLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const selectedRole = roles.find((r) => r.id === roleId) ?? null;
  const selectedCode = selectedRole?.code ?? null;

  const create = useCreateUser(() => {
    onOpenChange(false);
    setRoleId('');
    setFranchiseId('');
    setSalonId('');
    setSalons([]);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  useEffect(() => {
    if (!roleNeedsFranchise(selectedCode)) {
      setFranchiseId('');
      setSalonId('');
      setSalons([]);
    }
    if (!roleNeedsSalon(selectedCode)) {
      setSalonId('');
    }
  }, [selectedCode]);

  useEffect(() => {
    if (!franchiseId || !roleNeedsSalon(selectedCode)) {
      setSalons([]);
      setSalonId('');
      return;
    }

    let cancelled = false;
    setSalonsLoading(true);
    void fetchSalonsForFranchise(franchiseId)
      .then((rows) => {
        if (!cancelled) setSalons(rows);
      })
      .catch(() => {
        if (!cancelled) setSalons([]);
      })
      .finally(() => {
        if (!cancelled) setSalonsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId, selectedCode]);

  if (!open) return null;

  const needsFranchise = roleNeedsFranchise(selectedCode);
  const needsSalon = roleNeedsSalon(selectedCode);

  const canSubmit =
    Boolean(roleId) &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    (!needsFranchise || Boolean(franchiseId)) &&
    (!needsSalon || Boolean(salonId));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border/80 bg-ivory-soft/95 px-5 py-4 backdrop-blur">
          <h2 id={titleId} className="text-base font-semibold text-text">
            Add User
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Close"
            disabled={create.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || create.isPending) return;
            create.mutate({
              roleId,
              franchiseId: needsFranchise ? franchiseId : null,
              salonId: needsSalon ? salonId : null,
              firstName,
              lastName,
              email,
              phone: phone || undefined,
              password,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="user-first-name">First name</Label>
              <Input
                id="user-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="user-last-name">Last name</Label>
              <Input
                id="user-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={191}
            />
          </div>

          <div>
            <Label htmlFor="user-phone">Phone (optional)</Label>
            <Input
              id="user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              maxLength={20}
            />
          </div>

          <div>
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {ROLE_LABELS[role.code]}
                </option>
              ))}
            </select>
          </div>

          {needsFranchise ? (
            <div>
              <Label htmlFor="user-franchise">Business</Label>
              <select
                id="user-franchise"
                value={franchiseId}
                onChange={(e) => {
                  setFranchiseId(e.target.value);
                  setSalonId('');
                }}
                required
                className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                <option value="">Select business</option>
                {franchises.map((franchise) => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {needsSalon ? (
            <div>
              <Label htmlFor="user-salon">Salon</Label>
              <select
                id="user-salon"
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
                required
                disabled={!franchiseId || salonsLoading}
                className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne disabled:opacity-50"
              >
                <option value="">
                  {salonsLoading ? 'Loading salons…' : 'Select salon'}
                </option>
                {salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <Label htmlFor="user-password">Password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || create.isPending}
              className="bg-brand-orange text-white hover:bg-brand-orange-deep"
            >
              {create.isPending ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
