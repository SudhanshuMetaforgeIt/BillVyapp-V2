'use client';

import type { ReactNode } from 'react';
import { useAuthPageEntrance } from '@/features/auth/hooks/use-auth-page-entrance';
import { useLikelyNextPagesPrefetch } from '@/hooks/use-likely-next-pages-prefetch';

type AuthEntranceWrapperProps = {
  children: ReactNode;
};

/**
 * Lightweight client boundary for auth pages.
 * Handles the mount entrance GSAP animation and selective background prefetch
 * without forcing the entire branding panel, SVGs, or marketing markup into the client bundle.
 */
export function AuthEntranceWrapper({ children }: AuthEntranceWrapperProps) {
  const rootRef = useAuthPageEntrance();
  useLikelyNextPagesPrefetch();

  return (
    <div
      ref={rootRef}
      className="auth-page-shell relative flex min-h-dvh flex-1 flex-col bg-[#0A0A0A] lg:flex-row lg:items-stretch"
    >
      {children}
    </div>
  );
}
