'use client';

import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AppHeader } from '@/components/layout/header/app-header';
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import { navigationForRole } from '@/constants/navigation';
import { ROLE_SEGMENTS, type RoleCode } from '@/constants/roles';
import { dashboardHomeFor, ROUTES } from '@/constants/routes';
import { useAuthStatus, useCurrentUser } from '@/hooks/use-current-user';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/layout/page-transition';
import { useLikelyNextPagesPrefetch } from '@/hooks/use-likely-next-pages-prefetch';
import { AppShellSkeleton } from '@/components/skeletons/app-shell-skeleton';
import { MaintenanceGate } from '@/components/layout/maintenance-gate';

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
  useLikelyNextPagesPrefetch();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const handleToggleCollapsed = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const handleCloseMobile = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleOpenMobile = useCallback(() => {
    setSidebarOpen(true);
  }, [setSidebarOpen]);

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
    if (
      pathname.startsWith('/dashboard/') &&
      !pathname.includes(`/${expected}`)
    ) {
      router.replace(dashboardHomeFor(user.role));
    }
  }, [status, user, requiredRole, router, pathname]);

  const sections = useMemo(
    () => (user ? navigationForRole(user.role) : []),
    [user],
  );

  if (status === 'loading' || !user) {
    return <AppShellSkeleton />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <AppShellSkeleton />;
  }

  return (
    <MaintenanceGate>
      <div className="app-dashboard flex h-svh overflow-hidden bg-ivory text-text">
        <AppSidebar
          sections={sections}
          role={user.role}
          mobileOpen={sidebarOpen}
          onCloseMobile={handleCloseMobile}
          collapsed={sidebarCollapsed}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!hidePageHeader ? (
            <AppHeader
              user={user}
              title={title}
              subtitle={subtitle}
              notificationCount={notificationCount}
              onOpenSidebar={handleOpenMobile}
              onToggleCollapsed={handleToggleCollapsed}
              sidebarCollapsed={sidebarCollapsed}
            />
          ) : (
            <AppHeader
              user={user}
              notificationCount={notificationCount}
              onOpenSidebar={handleOpenMobile}
              onToggleCollapsed={handleToggleCollapsed}
              sidebarCollapsed={sidebarCollapsed}
            />
          )}

          <main
            className={cn(
              'app-dashboard-content min-h-0 min-w-0 flex-1 overflow-y-auto py-5 lg:py-6',
              contentClassName,
            )}
          >
            <PageTransition key={pathname}>{children}</PageTransition>
          </main>
        </div>
      </div>
    </MaintenanceGate>
  );
}
