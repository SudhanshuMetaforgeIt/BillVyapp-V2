'use client';

import {
  DashboardPreview,
  FeatureHighlights,
} from './dashboard-preview';
import { BrandLogo } from './brand-logo';

/** Left branding column for the login page (desktop) / compact header (mobile). */
export function LoginBrandingPanel({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <section
        data-auth-animate="branding"
        className="relative overflow-hidden bg-[#0A0A0A] px-5 py-6 text-white lg:hidden"
      >
        <div className="relative z-10 flex flex-col items-start gap-3">
          <div data-auth-animate="logo">
            <BrandLogo variant="dark" size="compact" priority />
          </div>
          <div>
            <h1
              data-auth-animate="headline"
              className="text-2xl font-bold tracking-tight"
            >
              Smarter Billing.{' '}
              <span className="text-[#FF6A00]">Stronger Business.</span>
            </h1>
            <p
              data-auth-animate="copy"
              className="mt-2 max-w-md text-sm leading-relaxed text-white/55"
            >
              BillVyApp is the all-in-one platform to manage businesses, clients,
              payments, and reports efficiently.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-auth-animate="branding"
      className="relative hidden min-h-screen overflow-hidden bg-[#0A0A0A] text-white lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:gap-6 lg:px-10 lg:py-8 xl:px-14 xl:py-10"
    >
      <div data-auth-animate="logo" className="relative z-10 shrink-0">
        <BrandLogo variant="dark" size="full" priority />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-4">
        <h1
          data-auth-animate="headline"
          className="text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl"
        >
          Smarter Billing.
          <br />
          Stronger <span className="text-[#FF6A00]">Business.</span>
        </h1>
        <p
          data-auth-animate="copy"
          className="mt-4 max-w-md text-sm leading-relaxed text-white/55 xl:text-base"
        >
          BillVyApp is the all-in-one platform to manage businesses, clients,
          payments, and reports efficiently.
        </p>

        <div data-auth-animate="preview" className="mt-8 xl:mt-10">
          <DashboardPreview />
        </div>
      </div>

      <div className="relative z-10 shrink-0 pt-2">
        <FeatureHighlights />
      </div>
    </section>
  );
}
