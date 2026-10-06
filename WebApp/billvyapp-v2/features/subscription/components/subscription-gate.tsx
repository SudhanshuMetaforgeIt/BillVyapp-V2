'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  needsSubscriptionGate,
  subscriptionRequiredPathFor,
} from '@/constants/routes';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Redirects ADMIN / MANAGER / STAFF without an active franchise subscription
 * to the subscription-required page. Allows that page itself through.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const subscriptionActive = useAuthStore((s) => s.user?.subscriptionActive);

  useEffect(() => {
    if (!role || !needsSubscriptionGate(role)) return;
    if (subscriptionActive !== false) return;

    const gatePath = subscriptionRequiredPathFor(role);
    if (!gatePath) return;
    if (pathname === gatePath) return;

    router.replace(gatePath);
  }, [role, subscriptionActive, pathname, router]);

  if (
    role &&
    needsSubscriptionGate(role) &&
    subscriptionActive === false
  ) {
    const gatePath = subscriptionRequiredPathFor(role);
    if (gatePath && pathname !== gatePath) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-text-secondary">
          Checking subscription…
        </div>
      );
    }
  }

  return <>{children}</>;
}
