import { AuthAuroraBackground } from './auth-aurora-background';
import { FeatureHighlights } from './dashboard-preview';
import { BrandLogo } from './brand-logo';

/** Left branding column for auth pages (desktop) / compact header (mobile). */
export function LoginBrandingPanel({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <section
        data-auth-animate="branding"
        className="auth-split-pane auth-branding-compact relative w-full min-w-0 bg-[#0A0A0A] px-4 py-5 text-white sm:px-6 sm:py-6 lg:hidden"
      >
        <AuthAuroraBackground tone="dark" />
        <div className="relative z-10 flex w-full min-w-0 max-w-full flex-col items-start gap-3">
          <div data-auth-animate="logo" className="max-w-full">
            <BrandLogo variant="dark" size="compact" priority />
          </div>
          <div className="min-w-0 max-w-full">
            <h1
              data-auth-animate="headline"
              className="text-2xl font-bold tracking-tight text-pretty break-words"
            >
              Smarter Billing.{' '}
              <span className="bg-gradient-to-r from-[#FF7B00] via-[#F55607] to-[#D4A017] bg-clip-text text-transparent">
                Stronger Business.
              </span>
            </h1>
            <p
              data-auth-animate="copy"
              className="mt-2 max-w-md text-sm leading-relaxed text-pretty text-white/60"
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
      className="auth-split-pane auth-branding-desktop @container/branding relative hidden min-h-dvh min-w-0 bg-[#0A0A0A] text-white lg:flex lg:max-w-[48%] lg:flex-[1_1_48%] lg:flex-col lg:justify-between lg:gap-5 lg:px-8 lg:py-8 xl:gap-6 xl:px-12 xl:py-10 2xl:px-14"
    >
      <AuthAuroraBackground tone="dark" />

      <div data-auth-animate="logo" className="relative z-10 max-w-full shrink-0">
        <BrandLogo variant="dark" size="full" priority />
      </div>

      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col justify-center py-2 xl:py-4">
        <h1
          data-auth-animate="headline"
          className="text-3xl font-bold leading-[1.15] tracking-tight text-pretty break-words xl:text-4xl 2xl:text-5xl"
        >
          Smarter Billing.
          <br />
          Stronger{' '}
          <span className="bg-gradient-to-r from-[#FF7B00] via-[#F55607] to-[#D4A017] bg-clip-text text-transparent">
            Business.
          </span>
        </h1>
        <p
          data-auth-animate="copy"
          className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-white/60 xl:text-base"
        >
          BillVyApp is the all-in-one platform to manage businesses, clients,
          payments, and reports efficiently.
        </p>
      </div>

      <div className="relative z-10 w-full min-w-0 max-w-full shrink-0 pt-2">
        <FeatureHighlights />
      </div>
    </section>
  );
}
