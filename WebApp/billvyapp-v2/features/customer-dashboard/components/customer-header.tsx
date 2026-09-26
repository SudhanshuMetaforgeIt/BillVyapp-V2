'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Scissors, User, X } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

const C = ROUTES.dashboard.customer;

const NAV_LINKS = [
  { label: 'Home', href: C.root },
  { label: 'Salons', href: C.salons },
  { label: 'My Bookings', href: C.myBookings },
  { label: 'Bills', href: C.bills },
  { label: 'Rewards', href: C.rewards },
];

function isActive(pathname: string, href: string) {
  return href === C.root ? pathname === C.root : pathname.startsWith(href);
}

export function CustomerHeader() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { logout, isPending } = useLogout();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EFE9DF] bg-[#FFFAF3]/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href={C.root}
            className="group flex items-center gap-2.5 transition-transform active:scale-95"
            aria-label="BillVy App Home"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF7B00] to-[#FFB347] shadow-sm shadow-[#FF7B00]/20">
              <Scissors className="size-5.5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-[#1C1C1E]">
              Bill<span className="text-[#FF7B00]">Vy</span> <span className="font-medium text-[#7D766C]">App</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 pl-4 md:flex" aria-label="Main Navigation">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative py-1 text-sm font-semibold transition-colors duration-150',
                    active ? 'text-[#FF7B00]' : 'text-[#4A453E] hover:text-[#1C1C1E]',
                  )}
                >
                  {link.label}
                  {active && <span className="absolute inset-x-0 -bottom-1 h-0.75 rounded-full bg-[#FF7B00]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={C.notifications}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E2D5] bg-white text-[#4A453E] transition-colors hover:bg-[#FAF7F2] hover:text-[#1C1C1E]',
              isActive(pathname, C.notifications) && 'border-[#FFB347] text-[#FF7B00]',
            )}
            aria-label="Notifications"
          >
            <Bell className="size-4.5" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-[#E9E2D5] bg-white p-1 pr-3 transition-colors hover:border-[#FFB347]"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE5CC] text-xs font-bold text-[#FF7B00]">
                {user?.firstName?.[0]?.toUpperCase() || 'C'}
              </div>
              <span className="hidden text-xs font-semibold text-[#1C1C1E] sm:inline">
                {user?.firstName || 'Account'}
              </span>
              <ChevronDown className="size-3 text-[#7D766C]" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[#E9E2D5] bg-white p-2 shadow-xl" role="menu">
                <div className="border-b border-[#F0EAE1] px-3 py-2">
                  <p className="text-xs font-bold text-[#1C1C1E]">
                    {user ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}
                  </p>
                  <p className="truncate text-[11px] text-[#7D766C]">{user?.email || ''}</p>
                </div>
                <div className="mt-1 space-y-0.5">
                  <Link
                    href={C.profile}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#4A453E] hover:bg-[#FAF7F2] hover:text-[#1C1C1E]"
                    role="menuitem"
                  >
                    <User className="size-3.5 text-[#FF7B00]" />
                    Profile & addresses
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#B42318] hover:bg-[#FEECEB] disabled:opacity-60"
                    role="menuitem"
                  >
                    <LogOut className="size-3.5" />
                    {isPending ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9E2D5] bg-white text-[#1C1C1E] md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#EFE9DF] bg-[#FFFAF3] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {[...NAV_LINKS, { label: 'Notifications', href: C.notifications }, { label: 'Profile', href: C.profile }].map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold',
                    isActive(pathname, link.href) ? 'bg-[#FFF3E5] text-[#FF7B00]' : 'text-[#4A453E] hover:bg-[#F5EFE6]',
                  )}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
