'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  needsSubscriptionGate,
  subscriptionRequiredPathFor,
} from '@/constants/routes';
import { useAuthStore, selectUser } from '@/stores/auth.store';

/**
 * Redirects ADMIN / MANAGER / STAFF without an active franchise subscription
 * to the subscription-required page. Allows that page itself through.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(selectUser);

  useEffect(() => {
    if (!user || !needsSubscriptionGate(user.role)) return;
    if (user.subscriptionActive !== false) return;

    const gatePath = subscriptionRequiredPathFor(user.role);
    if (!gatePath) return;
    if (pathname === gatePath) return;

    router.replace(gatePath);
  }, [user, pathname, router]);

  if (
    user &&
    needsSubscriptionGate(user.role) &&
    user.subscriptionActive === false
  ) {
    const gatePath = subscriptionRequiredPathFor(user.role);
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
