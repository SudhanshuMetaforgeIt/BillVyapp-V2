import { ArrowLeft, ShieldCheck, Store } from 'lucide-react';
import { BrandedAuthShell } from './branded-auth-shell';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { ROUTES } from '@/constants/routes';

export function RegisterPageView() {
  return (
    <BrandedAuthShell>
      <section data-auth-animate="card" className="login-form-shell" aria-labelledby="register-heading">
        <div className="login-form-card">
          <p className="login-access-label"><ShieldCheck className="size-3.5" aria-hidden /> Customer access</p>
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-champagne/35 bg-champagne/10 text-champagne" aria-hidden><Store className="size-6" /></div>
          <h2 id="register-heading" data-auth-animate="card-title" className="login-form-title font-bold tracking-tight">
            Contact your salon <span>to get started</span>
          </h2>
        <p data-auth-animate="card-subtitle" className="mt-4 text-sm leading-relaxed text-text-secondary">
          Self-registration will be available when account ownership
          verification is ready. Your salon can help you create a customer
          profile. If you already have an account, sign in below.
        </p>
        <PrefetchLink
          href={ROUTES.auth.login}
          prefetchStrategy="intent"
          data-auth-animate="cta"
          className="auth-cta mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-[#201911]"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to sign in
        </PrefetchLink>
        </div>
      </section>
    </BrandedAuthShell>
  );
}
