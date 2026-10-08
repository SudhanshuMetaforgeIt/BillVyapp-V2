'use client';

import { useState } from 'react';
import { Modal } from '@/components/data/modal';
import { SelectInput } from '@/components/data/form-fields';
import { SectionErrorState } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { api } from '@/services/api-client';
import { useUpdateMembership } from '../hooks/use-membership-mutations';
import { membershipChanges } from '../services/membership-edit';
import type { MembershipApiItem, MembershipPlanApiItem, PaginatedResponse } from '../types/memberships.types';

export function EditMemberDialog({ id, name, onClose }: {
  id: string; name: string; onClose: () => void;
}) {
  const query = useScopedQuery(['memberships', 'edit', id], async () => {
    const membership = await api.get<MembershipApiItem>(`/memberships/${id}`);
    const plans: MembershipPlanApiItem[] = [];
    let page = 1;
    while (true) {
      const result = await api.get<PaginatedResponse<MembershipPlanApiItem>>('/membership-plans', {
        params: { salonId: membership.salonId, isActive: true, page, limit: 100 },
      });
      plans.push(...result.data);
      if (page >= result.meta.totalPages) break;
      page++;
    }
    return { membership, plans };
  }, { capability: 'memberships.write', staleTime: 0, placeholderData: undefined });

  if (!query.data) return <Modal open title="Edit membership" onClose={onClose}>
    {query.isError
      ? <SectionErrorState message="We could not load this membership." onRetry={() => void query.refetch()} />
      : <p role="status">Loading membership…</p>}
  </Modal>;

  return <EditMemberForm membership={query.data.membership} plans={query.data.plans}
    name={name} onClose={onClose} />;
}

function EditMemberForm({ membership, plans, name, onClose }: {
  membership: MembershipApiItem; plans: MembershipPlanApiItem[];
  name: string; onClose: () => void;
}) {
  const [planId, setPlanId] = useState(membership.membershipPlanId);
  const [startDate, setStartDate] = useState(membership.startDate);
  const save = useUpdateMembership(onClose);
  const payload = membershipChanges(membership, planId, startDate);
  const valid = Boolean(planId) && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && Object.keys(payload).length > 0;
  const hasCurrentPlan = plans.some((plan) => plan.id === membership.membershipPlanId);

  return <Modal open onClose={onClose} title="Edit membership" description={name} busy={save.isPending}>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (valid && !save.isPending) save.mutate({ id: membership.id, payload });
    }}>
      <div className="space-y-1.5">
        <Label htmlFor="edit-member-plan">Membership plan</Label>
        <SelectInput id="edit-member-plan" value={planId} disabled={save.isPending}
          onChange={(event) => setPlanId(event.target.value)}>
          {!hasCurrentPlan && <option value={membership.membershipPlanId}>
            {membership.membershipName ?? membership.planSnapshot?.name ?? 'Current plan'} (current)
          </option>}
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </SelectInput>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-member-start">Start date</Label>
        <Input id="edit-member-start" type="date" value={startDate} required disabled={save.isPending}
          onChange={(event) => setStartDate(event.target.value)} />
      </div>
      <p className="text-sm text-text-secondary">The end date is recalculated when you save. Changing the plan applies that plan’s current terms; changing only the start date keeps the enrollment terms.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  </Modal>;
}
