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
      : user.email.split('@')[0]
    : 'Rohit Sharma';
  const roleLabel = user ? ROLE_LABELS[user.role] : 'Admin';

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
          'flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 shadow-xs transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <UserRound className="size-3.5" />
        </span>
        <span className="truncate text-xs font-bold text-stone-800 dark:text-stone-200">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-stone-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-800 dark:bg-stone-900"
        >
          {/* User Info Header */}
          <div className="border-b border-stone-100 px-3.5 py-2.5 dark:border-stone-800">
            <p className="truncate text-xs font-bold text-stone-900 dark:text-white">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-stone-400 dark:text-stone-500">
              {user?.email || 'rohit@starrkuts.com'}
            </p>
            <span className="mt-1 inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {roleLabel}
            </span>
          </div>

          {/* Profile link */}
          <Link
            href={accountPath(user, 'profile')}
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-amber-600 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-amber-400"
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4 text-stone-400" aria-hidden />
            <span>Profile</span>
          </Link>

          {/* Settings link */}
          <Link
            href={accountPath(user, 'settings')}
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-amber-600 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-amber-400"
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4 text-stone-400" aria-hidden />
            <span>Settings</span>
          </Link>

          <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

          {/* Logout */}
          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 disabled:opacity-60"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            <span>{isPending ? 'Signing out…' : 'Logout'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
