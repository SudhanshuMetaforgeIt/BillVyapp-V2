'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, X } from 'lucide-react';

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
  // Exact match for role dashboard root; nested routes match prefix.
  if (href.endsWith('/super_admin') || href.match(/\/dashboard\/[^/]+$/)) {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
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

  const nav = (
      <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <BrandLogo
              variant="dark"
              size="compact"
              className={cn(
                'h-12 w-40 shrink-0 [&_img]:object-left',
                collapsed && 'mx-auto h-10 w-10',
              )}
              priority
            />
            {!collapsed ? (
              <p className="mt-2 px-0.5 text-xs font-medium tracking-wide text-white/65">
                {role ? ROLE_LABELS[role] : 'BillVyApp'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Primary"
      >
        {sections.map((section) => (
          <ul key={section.id} className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal',
                      active
                        ? 'bg-champagne text-charcoal shadow-sm'
                        : 'text-white/80 hover:bg-white/8 hover:text-white',
                      collapsed && 'justify-center px-2',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'size-[1.15rem] shrink-0',
                        active ? 'text-charcoal' : 'text-white/70 group-hover:text-white',
                      )}
                      aria-hidden
                    />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-white/10 p-4">
        {!collapsed ? (
          <div className="rounded-xl bg-white/5 px-3 py-3">
            <p className="text-sm font-semibold text-white">Need Help?</p>
            <p className="mt-0.5 text-xs text-white/60">
              Reach platform support for franchise onboarding.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void logout()}
          disabled={isPending}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-colors',
            'hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne',
            'disabled:opacity-60',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="size-[1.15rem]" aria-hidden />
          {!collapsed ? <span>{isPending ? 'Signing out…' : 'Logout'}</span> : null}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden h-svh shrink-0 bg-charcoal text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:flex-col',
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
        )}
      >
        {nav}
      </aside>

      {/* Mobile drawer */}
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
            'absolute inset-0 bg-charcoal/50 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onCloseMobile}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-charcoal shadow-2xl transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-hidden={!mobileOpen}
        >
          {nav}
        </aside>
      </div>
    </>
  );
}
