import type { ReactNode } from 'react';

import { AuthAuroraBackground } from '@/features/auth/components/auth-aurora-background';
import { AuthEntranceWrapper } from '@/features/auth/components/auth-entrance-wrapper';
import { LoginBrandingPanel } from '@/features/auth/components/login-branding-panel';

/**
 * Shared Login / Signup shell rendered on the server.
 * The branding panel, illustration cards, and decorative backgrounds are rendered
 * to static HTML on the server and do NOT send JavaScript to the client.
 */
export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <AuthEntranceWrapper>
      <AuthAuroraBackground tone="dark" className="lg:hidden" />

      <LoginBrandingPanel compact />
      <LoginBrandingPanel />

      <section className="auth-split-pane auth-form-column relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[52%] lg:flex-[1_1_52%] lg:px-8 lg:py-12 xl:px-10">
        <AuthAuroraBackground tone="soft" />

        <div className="relative z-10 flex w-full min-w-0 max-w-full flex-1 flex-col items-center justify-center">
          {children}
        </div>

        <p
          data-auth-animate="footer"
          className="relative z-10 mt-6 w-full min-w-0 max-w-full px-1 text-center text-xs text-pretty text-text-secondary sm:mt-8 sm:text-sm"
        >
          © 2026 BillVyApp. All rights reserved by Metaforgeit Solutions
        </p>
      </section>
    </AuthEntranceWrapper>
  );
}
