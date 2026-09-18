'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LogOut, X } from 'lucide-react';

import { BrandLogo } from '@/features/auth/components/brand-logo';
import type { NavSection } from '@/constants/navigation';
import { ROLE_LABELS, type RoleCode } from '@/constants/roles';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { cn } from '@/lib/utils';

type AppSidebarProps = {
  sections: NavSection[];
  role: RoleCode | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
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
  logout: () => void;
  isPending: boolean;
};

function SidebarNav({
  sections,
  role,
  pathname,
  collapsed,
  onNavigate,
  onCloseMobile,
  logout,
  isPending,
}: SidebarNavProps) {
  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      <div className={cn('shrink-0 px-3 pt-4 pb-3', collapsed && 'px-2 pt-3')}>
        {collapsed ? (
          <div className="flex flex-col items-center">
            <BrandLogo
              variant="dark"
              size="compact"
              className="h-9 w-9 shrink-0 [&_img]:object-center"
              priority
            />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <BrandLogo
                variant="dark"
                size="compact"
                className="h-11 w-36 shrink-0 [&_img]:object-left"
                priority
              />
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
        <ul className="flex flex-col gap-0.5 pb-2">
          {sections.flatMap((section) =>
            section.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
                      active
                        ? 'app-sidebar-nav-active text-white shadow-[0_8px_20px_rgb(255_123_0_/0.28)]'
                        : 'text-white/85 hover:bg-white/6 hover:text-white',
                      collapsed && 'justify-center px-2',
                    )}
                    title={item.label}
                  >
                    <Icon
                      className={cn(
                        'size-[1.05rem] shrink-0',
                        active
                          ? 'text-white'
                          : 'text-white/75 group-hover:text-white',
                      )}
                      aria-hidden
                    />
                    {!collapsed ? (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {active ? (
                          <ChevronRight
                            className="size-3.5 shrink-0 text-white/90"
                            aria-hidden
                          />
                        ) : null}
                      </>
                    ) : null}
                  </Link>
                </li>
              );
            }),
          )}
        </ul>
      </nav>

      <div
        className={cn(
          'relative z-10 shrink-0 space-y-2 border-t border-white/10 p-3',
          collapsed && 'px-2',
        )}
      >
        {!collapsed ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-sm font-semibold text-white">Need Help?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/55">
              Reach platform support for franchise onboarding.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void logout()}
          disabled={isPending}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-white/85 transition-colors',
            'hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7B00]',
            'disabled:opacity-60',
            collapsed && 'justify-center px-2',
          )}
          title="Logout"
        >
          <LogOut className="size-[1.05rem]" aria-hidden />
          {!collapsed ? (
            <span>{isPending ? 'Signing out…' : 'Logout'}</span>
          ) : null}
        </button>
      </div>
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
  const { logout, isPending } = useLogout();

  return (
    <>
      <aside
        className={cn(
          'app-sidebar-panel relative hidden h-full shrink-0 overflow-hidden text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex lg:flex-col',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        <div className="app-sidebar-glow" aria-hidden />
        <div className="app-sidebar-arc" aria-hidden />
        <SidebarNav
          sections={sections}
          role={role}
          pathname={pathname}
          collapsed={collapsed}
          logout={logout}
          isPending={isPending}
        />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <button
          type="button"
          aria-label="Close navigation overlay"
          className={cn(
            'absolute inset-0 bg-black/55 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onCloseMobile}
        />
        <aside
          className={cn(
            'app-sidebar-panel absolute inset-y-0 left-0 flex h-full w-[min(18rem,88vw)] flex-col overflow-hidden shadow-2xl transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
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
            logout={logout}
            isPending={isPending}
          />
        </aside>
      </div>
    </>
  );
}
