'use client';

import { PrefetchLink } from '@/components/ui/prefetch-link';
import { usePathname } from 'next/navigation';
import { ChevronRight, X } from 'lucide-react';

import { BrandLogo } from '@/features/auth/components/brand-logo';
import type { NavSection } from '@/constants/navigation';
import { ROLE_LABELS, type RoleCode } from '@/constants/roles';
import { dashboardHomeFor, ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useSidebarNavigationMotion } from './use-sidebar-navigation-motion';
import { useSidebarPanelMotion } from './use-sidebar-panel-motion';

type AppSidebarProps = {
  sections: NavSection[];
  role: RoleCode | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard/manager/inventory' && /^\/dashboard\/manager\/(stock-movements|purchases|vendors)(\/|$)/.test(pathname)) return true;
  if (pathname === href) return true;
  if (href.endsWith('/super_admin') || href.match(/\/dashboard\/[^/]+$/)) {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
}

type SidebarNavProps = {
  sections: NavSection[];
  role: RoleCode | null;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  onCloseMobile?: () => void;
};

function SidebarNav({
  sections,
  role,
  pathname,
  collapsed,
  onNavigate,
  onCloseMobile,
}: SidebarNavProps) {
  const homeHref = role ? dashboardHomeFor(role) : ROUTES.dashboard.root;
  const { rootRef, animateLink } = useSidebarNavigationMotion(pathname, collapsed, Boolean(onCloseMobile));

  return (
    <div ref={rootRef} className="relative z-10 flex h-full min-h-0 flex-col">
      <div data-sidebar-enter className={cn('shrink-0 px-3 pt-4 pb-3', collapsed && 'px-2 pt-3')}>
        {collapsed ? (
          <div className="flex w-12 flex-col items-center">
            <PrefetchLink
              href={homeHref}
              onClick={onNavigate}
              aria-label="Go to dashboard"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7B00]"
            >
              <BrandLogo
                variant="dark"
                size="compact"
                src="/billvyapp_b_logo.png"
                className="h-9 w-9 shrink-0 [&_img]:object-center"
                priority
              />
            </PrefetchLink>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <PrefetchLink
                href={homeHref}
                onClick={onNavigate}
                aria-label="Go to dashboard"
                className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7B00]"
              >
                <BrandLogo
                  variant="dark"
                  size="compact"
                  src="/billvyapp_b_logo.png"
                  className="h-11 w-36 shrink-0 [&_img]:object-left"
                  priority
                />
              </PrefetchLink>
              <p className="mt-1.5 px-0.5 text-[11px] font-medium tracking-[0.14em] text-[#FFB347]/90 uppercase">
                {role ? ROLE_LABELS[role] : 'BillVyApp'}
              </p>
            </div>

            {onCloseMobile ? (
              <button
                type="button"
                className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7B00] lg:hidden"
                onClick={onCloseMobile}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <nav
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-1',
          collapsed && 'px-2',
        )}
        aria-label="Primary"
      >
        <ul data-sidebar-list className="relative isolate flex flex-col gap-0.5 pb-2">
          <li aria-hidden className="pointer-events-none absolute inset-0">
            <span data-sidebar-indicator className="app-sidebar-nav-active absolute top-0 left-0 block rounded-xl opacity-0 shadow-[0_8px_20px_rgb(255_123_0_/0.28)]" />
          </li>
          {sections.flatMap((section) =>
            section.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.id}>
                  <PrefetchLink
                    data-sidebar-link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    onPointerEnter={event => { if (event.pointerType === 'mouse') animateLink(event.currentTarget, true); }}
                    onPointerLeave={event => animateLink(event.currentTarget, false)}
                    onFocus={event => animateLink(event.currentTarget, true)}
                    onBlur={event => animateLink(event.currentTarget, false)}
                    className={cn(
                      'group relative z-10 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
                      active
                        ? 'text-white'
                        : 'text-white/85 hover:bg-white/6 hover:text-white',
                      collapsed && 'px-2',
                    )}
                    title={item.label}
                  >
                    <Icon
                      data-sidebar-icon
                      className={cn(
                        'size-[1.05rem] shrink-0',
                        collapsed && 'ml-2',
                        active
                          ? 'text-white'
                          : 'text-white/75 group-hover:text-white',
                      )}
                      aria-hidden
                    />
                    {!collapsed ? (
                      <>
                        <span data-sidebar-label className="flex-1 truncate">{item.label}</span>
                        {active ? (
                          <ChevronRight
                            className="size-3.5 shrink-0 text-white/90"
                            aria-hidden
                          />
                        ) : null}
                      </>
                    ) : null}
                  </PrefetchLink>
                </li>
              );
            }),
          )}
        </ul>
      </nav>

      {!collapsed && role !== 'MANAGER' && role !== 'ADMIN' ? (
        <div data-sidebar-enter className="relative z-10 shrink-0 border-t border-white/10 p-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-sm font-semibold text-white">Need Help?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/55">
              Reach platform support for franchise onboarding.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({
  sections,
  role,
  mobileOpen,
  onCloseMobile,
  collapsed = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { desktopRef, drawerRef, backdropRef } = useSidebarPanelMotion(collapsed, mobileOpen, onCloseMobile);

  return (
    <>
      <aside
        ref={desktopRef}
        data-sidebar-desktop
        className={cn(
          'app-sidebar-panel relative hidden h-full shrink-0 overflow-hidden text-sidebar-foreground lg:flex lg:flex-col',
          collapsed ? 'lg:w-16' : 'app-sidebar-expanded lg:w-64',
        )}
      >
        <div className="app-sidebar-glow" aria-hidden />
        <div className="app-sidebar-arc" aria-hidden />
        <SidebarNav
          sections={sections}
          role={role}
          pathname={pathname}
          collapsed={collapsed}
        />
      </aside>

      <div
        inert={!mobileOpen}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? 'Navigation menu' : undefined}
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <button
          ref={backdropRef}
          style={{ opacity: 0 }}
          type="button"
          aria-label="Close navigation overlay"
          className="absolute inset-0 bg-black/55"
          onClick={onCloseMobile}
        />
        <aside
          ref={drawerRef}
          data-sidebar-mobile
          style={{ transform: 'translateX(-105%)' }}
          className={cn(
            'app-sidebar-panel absolute inset-y-0 left-0 flex h-full w-[min(18rem,88vw)] flex-col overflow-hidden shadow-2xl',
          )}
          aria-hidden={!mobileOpen}
        >
          <div className="app-sidebar-glow" aria-hidden />
          <div className="app-sidebar-arc" aria-hidden />
          <SidebarNav
            sections={sections}
            role={role}
            pathname={pathname}
            collapsed={false}
            onNavigate={onCloseMobile}
            onCloseMobile={onCloseMobile}
          />
        </aside>
      </div>
    </>
  );
}
