'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { api } from '@/services/api-client';
import { useAuthStore, selectUser } from '@/stores/auth.store';
import type { ApiError } from '@/types/api.types';
import {
  dashboardHomeFor,
  needsSubscriptionGate,
} from '@/constants/routes';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type MeSubscription = {
  id: string;
  planName: string;
  status: string;
  endsAt: string;
  isCurrentlyActive: boolean;
} | null;

export function SubscriptionRequiredView() {
  const user = useAuthStore(selectUser);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useLogout();
  const router = useRouter();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['franchise-subscriptions', 'me'],
    queryFn: () => api.get<MeSubscription>('/franchise-subscriptions/me'),
    enabled: Boolean(user && needsSubscriptionGate(user.role)),
    retry: false,
  });

  useEffect(() => {
    if (!user || !needsSubscriptionGate(user.role)) return;
    if (meQuery.data?.isCurrentlyActive && user.subscriptionActive === false) {
      setUser({
        ...user,
        subscriptionActive: true,
        subscriptionPlanName: meQuery.data.planName,
        subscriptionEndsAt: meQuery.data.endsAt,
      });
      router.replace(dashboardHomeFor(user.role));
    }
  }, [meQuery.data, user, setUser, router]);

  const requestMutation = useMutation({
    mutationFn: () =>
      api.post<{ message: string; ticketId: string }>(
        '/franchise-subscriptions/request',
        {},
      ),
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({
        queryKey: ['franchise-subscriptions', 'me'],
      });
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });

  const planLabel =
    meQuery.data?.planName ?? user?.subscriptionPlanName ?? null;
  const endsAt = meQuery.data?.endsAt ?? user?.subscriptionEndsAt ?? null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-champagne-light text-brand-orange">
        <CreditCard className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-text">
        Subscription required
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Your business is not enrolled on an active BillVyApp plan. Ask Super
        Admin to enroll the franchise, or send a request below.
      </p>

      {(planLabel || endsAt) && (
        <div className="mt-5 w-full rounded-xl border border-border bg-ivory/60 px-4 py-3 text-left text-sm">
          {planLabel ? (
            <p>
              <span className="text-text-secondary">Last plan: </span>
              <span className="font-medium text-text">{planLabel}</span>
            </p>
          ) : null}
          {endsAt ? (
            <p className="mt-1">
              <span className="text-text-secondary">Ended / ends: </span>
              <span className="font-medium text-text">{endsAt}</span>
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="bg-brand-orange text-white hover:bg-brand-orange-deep"
          disabled={requestMutation.isPending}
          onClick={() => requestMutation.mutate()}
        >
          {requestMutation.isPending
            ? 'Sending request…'
            : 'Request subscription'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={logout.isPending}
          onClick={() => void logout.logout()}
        >
          <LogOut className="mr-1.5 size-3.5" aria-hidden />
          Log out
        </Button>
      </div>
    </div>
  );
}
