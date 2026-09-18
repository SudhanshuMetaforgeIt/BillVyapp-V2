'use client';

import { AuthAuroraBackground } from '@/features/auth/components/auth-aurora-background';
import { LoginBrandingPanel } from '@/features/auth/components/login-branding-panel';
import { RegisterFormCard } from '@/features/auth/components/register-form-card';
import { useAuthPageEntrance } from '@/features/auth/hooks/use-auth-page-entrance';

export function RegisterPageView() {
  const rootRef = useAuthPageEntrance();

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#0A0A0A] lg:flex-row"
    >
      <AuthAuroraBackground tone="dark" className="lg:hidden" />

      <LoginBrandingPanel compact />
      <LoginBrandingPanel />

      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8 lg:w-[52%] lg:px-10 lg:py-12">
        <AuthAuroraBackground tone="soft" />

        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
          <RegisterFormCard />
        </div>

        <p
          data-auth-animate="footer"
          className="relative z-10 mt-8 text-center text-xs text-text-secondary sm:text-sm"
        >
          © 2026 BillVyApp. All rights reserved by Metaforgeit Solutions
        </p>
      </section>
    </div>
  );
}
