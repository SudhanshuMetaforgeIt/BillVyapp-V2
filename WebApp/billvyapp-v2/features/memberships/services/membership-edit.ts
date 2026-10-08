import type { MembershipApiItem, UpdateMembershipPayload } from '../types/memberships.types';

/** Sending an unchanged plan would replace the issued membership's terms. */
export function membershipChanges(
  membership: Pick<MembershipApiItem, 'membershipPlanId' | 'startDate'>,
  planId: string,
  startDate: string,
): UpdateMembershipPayload {
  return {
    ...(planId !== membership.membershipPlanId ? { membershipPlanId: planId } : {}),
    ...(startDate !== membership.startDate ? { startDate } : {}),
  };
}
