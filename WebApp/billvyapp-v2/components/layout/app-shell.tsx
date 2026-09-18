'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AppHeader } from '@/components/layout/header/app-header';
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import { navigationForRole } from '@/constants/navigation';
import { ROLE_SEGMENTS, type RoleCode } from '@/constants/roles';
import { dashboardHomeFor, ROUTES } from '@/constants/routes';
import { useAuthStatus, useCurrentUser } from '@/hooks/use-current-user';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  notificationCount?: number;
  /** When set, only this role may view the current area (UX gate; backend remains authority). */
  requiredRole?: RoleCode;
  contentClassName?: string;
  hidePageHeader?: boolean;
};

export function AppShell({
  children,
  title,
  subtitle,
  notificationCount = 0,
  requiredRole,
  contentClassName,
  hidePageHeader = false,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  const status = useAuthStatus();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const handleToggleCollapsed = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (status !== 'authenticated' || !user) {
      router.replace(ROUTES.auth.login);
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      router.replace(dashboardHomeFor(user.role));
      return;
    }

    const expected = ROLE_SEGMENTS[user.role];
    if (pathname.startsWith('/dashboard/') && !pathname.includes(`/${expected}`)) {
      router.replace(dashboardHomeFor(user.role));
    }
  }, [status, user, requiredRole, router, pathname]);

  if (status === 'loading' || !user) {
    return (
      <div className="flex h-svh items-center justify-center bg-ivory">
        <div className="h-10 w-10 animate-pulse rounded-full bg-champagne/40" aria-label="Loading" />
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex h-svh items-center justify-center bg-ivory">
        <div className="h-10 w-10 animate-pulse rounded-full bg-champagne/40" aria-label="Loading" />
      </div>
    );
  }

  const sections = navigationForRole(user.role);

  return (
    <div className="flex h-svh overflow-hidden bg-ivory text-text">
      <AppSidebar
        sections={sections}
        role={user.role}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!hidePageHeader ? (
          <AppHeader
            user={user}
            title={title}
            subtitle={subtitle}
            notificationCount={notificationCount}
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleCollapsed={handleToggleCollapsed}
            sidebarCollapsed={sidebarCollapsed}
          />
        ) : (
          <AppHeader
            user={user}
            notificationCount={notificationCount}
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleCollapsed={handleToggleCollapsed}
            sidebarCollapsed={sidebarCollapsed}
          />
        )}

        <main
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6',
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
