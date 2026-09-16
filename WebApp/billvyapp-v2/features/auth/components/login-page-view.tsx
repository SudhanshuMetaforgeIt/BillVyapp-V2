'use client';

import { LoginBrandingPanel } from '@/features/auth/components/login-branding-panel';
import { LoginFormCard } from '@/features/auth/components/login-form-card';
import { useAuthPageEntrance } from '@/features/auth/hooks/use-auth-page-entrance';

export function LoginPageView() {
  const rootRef = useAuthPageEntrance();

  return (
    <div
      ref={rootRef}
      className="flex min-h-screen flex-col bg-[#F7F7F7] lg:flex-row"
    >
      <LoginBrandingPanel compact />
      <LoginBrandingPanel />

      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8 lg:w-[52%] lg:px-10 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            data-auth-animate="decor"
            className="absolute -top-24 -right-16 h-72 w-72 rounded-full border border-[#FF6A00]/20"
          />
          <div
            data-auth-animate="decor"
            className="absolute top-20 -right-28 h-56 w-56 rounded-full border border-[#FF6A00]/12"
          />
          <div
            data-auth-animate="decor"
            className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full border border-[#FF6A00]/15"
          />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
          <LoginFormCard />
        </div>

        <p
          data-auth-animate="footer"
          className="relative z-10 mt-8 text-center text-xs text-neutral-500 sm:text-sm"
        >
          © 2026 BillVyApp. All rights reserved by Metaforgeit Solutions
        </p>
      </section>
    </div>
  );
}
