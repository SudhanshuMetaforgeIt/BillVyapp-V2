'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';

import { ROLE_LABELS, ROLE_SEGMENTS } from '@/constants/roles';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { formatFullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/types/user.types';

type UserMenuProps = {
  user: AuthUser | null;
};

function initials(user: AuthUser | null): string {
  if (!user) return 'U';
  const a = user.firstName?.[0] ?? '';
  const b = user.lastName?.[0] ?? '';
  const value = `${a}${b}`.toUpperCase();
  return value || user.email.slice(0, 1).toUpperCase() || 'U';
}

function accountPath(user: AuthUser | null, page: 'profile' | 'settings'): string {
  if (!user) return '#';
  return `/dashboard/${ROLE_SEGMENTS[user.role]}/${page}`;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { logout, isPending } = useLogout();

  const displayName = user
    ? formatFullName(user) !== '-'
      ? formatFullName(user)
      : user.email
    : 'Account';
  const roleLabel = user ? ROLE_LABELS[user.role] : 'Signed in';

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors',
          'hover:bg-champagne-light/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-champagne text-sm font-semibold text-charcoal">
          {initials(user)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm font-semibold text-text">
            {displayName}
          </span>
          <span className="block truncate text-xs text-text-secondary">
            {roleLabel}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'hidden size-4 text-text-secondary transition-transform sm:block',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-text">{displayName}</p>
            <p className="truncate text-xs text-text-secondary">{user?.email}</p>
          </div>
          <Link
            href={accountPath(user, 'profile')}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-ivory focus-visible:bg-ivory focus-visible:outline-none"
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4 text-text-secondary" aria-hidden />
            Profile
          </Link>
          <Link
            href={accountPath(user, 'settings')}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-ivory focus-visible:bg-ivory focus-visible:outline-none"
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4 text-text-secondary" aria-hidden />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-ivory focus-visible:bg-ivory focus-visible:outline-none disabled:opacity-60"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            {isPending ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
