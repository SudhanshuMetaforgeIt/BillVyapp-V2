'use client';

import Link from 'next/link';
import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { UserMenu } from '@/components/layout/user-menu/user-menu';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/types/user.types';

type AppHeaderProps = {
  user: AuthUser | null;
  title?: string;
  subtitle?: string;
  notificationCount?: number;
  onOpenSidebar: () => void;
  onToggleCollapsed?: () => void;
  sidebarCollapsed?: boolean;
  className?: string;
};

export function AppHeader({
  user,
  title,
  subtitle,
  notificationCount = 0,
  onOpenSidebar,
  onToggleCollapsed,
  sidebarCollapsed = false,
  className,
}: AppHeaderProps) {
  const badge =
    notificationCount > 99 ? '99+' : notificationCount > 0 ? String(notificationCount) : null;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/80 bg-ivory-soft/85 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-charcoal shadow-sm transition hover:border-champagne/50 hover:bg-champagne-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>

        {onToggleCollapsed ? (
          <button
            type="button"
            className="hidden size-10 items-center justify-center rounded-xl border border-border bg-surface text-charcoal shadow-sm transition hover:border-champagne/50 hover:bg-champagne-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne lg:inline-flex"
            onClick={onToggleCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {title ? (
            <>
              <h1 className="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 truncate text-sm text-text-secondary">{subtitle}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-medium text-text-secondary">BillVyApp</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={ROUTES.dashboard.superAdmin.notifications}
            className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-charcoal shadow-sm transition hover:border-champagne/50 hover:bg-champagne-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label={
              badge
                ? `Notifications, ${badge} unread`
                : 'Notifications'
            }
          >
            <Bell className="size-5" />
            {badge ? (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </Link>

          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
