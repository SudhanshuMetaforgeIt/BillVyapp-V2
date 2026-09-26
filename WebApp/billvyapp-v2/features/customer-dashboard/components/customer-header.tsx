'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  MapPin,
  Menu,
  Scissors,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuthStore } from '@/stores/auth.store';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const NAV_LINKS = [
  { label: 'Home', href: ROUTES.dashboard.customer.root },
  { label: 'Salons', href: ROUTES.dashboard.customer.salons },
  { label: 'Services', href: ROUTES.dashboard.customer.services },
  { label: 'My Bookings', href: ROUTES.dashboard.customer.myBookings },
];

const CITIES = [
  'Hyderabad, India',
  'Banjara Hills, Hyderabad',
  'Jubilee Hills, Hyderabad',
  'Madhapur, Hyderabad',
  'Gachibowli, Hyderabad',
  'Hitec City, Hyderabad',
  'Kondapur, Hyderabad',
];

export function CustomerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const clearSession = useAuthStore((s) => s.clearSession);

  const selectedCity = useCustomerBookingStore((s) => s.selectedCity);
  const setSelectedCity = useCustomerBookingStore((s) => s.setSelectedCity);
  const bookings = useCustomerBookingStore((s) => s.bookings);

  const [locationOpen, setLocationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const upcomingCount = bookings.filter((b) => b.status === 'UPCOMING').length;

  const handleLogout = () => {
    clearSession();
    router.replace(ROUTES.auth.login);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EFE9DF] bg-[#FFFAF3]/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            href={ROUTES.dashboard.customer.root}
            className="group flex items-center gap-2.5 transition-transform active:scale-95"
            aria-label="BillVy App Home"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF7B00] to-[#FFB347] shadow-sm shadow-[#FF7B00]/20">
              <Scissors className="size-5.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl font-bold tracking-tight text-[#1C1C1E]">
                Bill<span className="text-[#FF7B00]">Vy</span> <span className="font-medium text-[#7D766C]">App</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 pl-4" aria-label="Main Navigation">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === ROUTES.dashboard.customer.root
                  ? pathname === ROUTES.dashboard.customer.root
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative py-1 text-sm font-semibold transition-colors duration-150',
                    isActive
                      ? 'text-[#FF7B00]'
                      : 'text-[#4A453E] hover:text-[#1C1C1E]',
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-1 h-0.75 rounded-full bg-[#FF7B00]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Location selector, Notification bell, User profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Location Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setLocationOpen(!locationOpen);
                setUserMenuOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-full border border-[#E9E2D5] bg-white/90 px-3 py-1.5 text-xs font-medium text-[#4A453E] shadow-2xs hover:border-[#FFB347] hover:text-[#1C1C1E] transition-colors"
            >
              <MapPin className="size-3.5 text-[#FF7B00]" />
              <span className="max-w-[130px] truncate sm:max-w-[180px]">
                {selectedCity}
              </span>
              <ChevronDown className="size-3 text-[#7D766C]" />
            </button>

            {locationOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E9E2D5] bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-xs font-semibold text-[#8C8375] uppercase tracking-wider">
                  Select Area
                </div>
                <div className="space-y-1">
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setSelectedCity(city);
                        setLocationOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors',
                        selectedCity === city
                          ? 'bg-[#FFF3E5] text-[#FF7B00] font-semibold'
                          : 'text-[#4A453E] hover:bg-[#FAF7F2] hover:text-[#1C1C1E]',
                      )}
                    >
                      <MapPin className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{city}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setLocationOpen(false);
                setUserMenuOpen(false);
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E2D5] bg-white text-[#4A453E] hover:bg-[#FAF7F2] hover:text-[#1C1C1E] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-4.5" />
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#FF7B00] text-[10px] font-bold text-white shadow-2xs">
                {upcomingCount > 0 ? upcomingCount : '3'}
              </span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E9E2D5] bg-white p-3 shadow-xl z-50">
                <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-2 px-1">
                  <h4 className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[11px] text-[#FF7B00] font-medium">3 New</span>
                </div>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="rounded-xl bg-[#FFF7EE] p-2.5 border border-[#FFE6CC]">
                    <p className="font-semibold text-[#1C1C1E]">Special Offer 20% OFF</p>
                    <p className="text-[#665E55] mt-0.5">Use code WELCOME20 on your first salon booking!</p>
                  </div>
                  <div className="rounded-xl bg-[#FBF9F5] p-2.5 border border-[#EFEAE1]">
                    <p className="font-semibold text-[#1C1C1E]">Appointment Reminder</p>
                    <p className="text-[#665E55] mt-0.5">Your haircut at Style Studio is confirmed.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setLocationOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-[#E9E2D5] bg-white p-1 pr-3 hover:border-[#FFB347] transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE5CC] text-xs font-bold text-[#FF7B00]">
                {user?.firstName?.[0] || 'A'}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-[#1C1C1E]">
                {user ? `${user.firstName}` : 'Akshith'}
              </span>
              <ChevronDown className="size-3 text-[#7D766C]" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E9E2D5] bg-white p-2 shadow-xl z-50">
                <div className="border-b border-[#F0EAE1] px-3 py-2">
                  <p className="text-xs font-bold text-[#1C1C1E]">
                    {user ? `${user.firstName} ${user.lastName || ''}` : 'Akshith Kola'}
                  </p>
                  <p className="text-[11px] text-[#7D766C] truncate">
                    {user?.email || 'customer@billvyapp.com'}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-[#FFF0DE] px-2 py-0.5 text-[10px] font-semibold text-[#FF7B00]">
                    Verified Customer
                  </span>
                </div>

                <div className="mt-1 space-y-0.5">
                  <Link
                    href={ROUTES.dashboard.customer.myBookings}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#4A453E] hover:bg-[#FAF7F2] hover:text-[#1C1C1E]"
                  >
                    <Calendar className="size-3.5 text-[#FF7B00]" />
                    My Bookings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#B42318] hover:bg-[#FEECEB]"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9E2D5] bg-white text-[#1C1C1E] md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#EFE9DF] bg-[#FFFAF3] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold',
                  pathname === link.href
                    ? 'bg-[#FFF3E5] text-[#FF7B00]'
                    : 'text-[#4A453E] hover:bg-[#F5EFE6]',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
