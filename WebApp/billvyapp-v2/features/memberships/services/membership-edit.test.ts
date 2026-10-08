import { describe, expect, it } from 'vitest';
import { membershipChanges } from './membership-edit';

describe('editing issued memberships', () => {
  const membership = { membershipPlanId: 'original-plan', startDate: '2026-10-01' };

  it('does not resend a plan when only the date changes, preserving enrollment terms', () => {
    expect(membershipChanges(membership, 'original-plan', '2026-10-02')).toEqual({ startDate: '2026-10-02' });
  });
  it('only replaces terms when the user chooses a different plan', () => {
    expect(membershipChanges(membership, 'new-plan', '2026-10-01')).toEqual({ membershipPlanId: 'new-plan' });
  });
  it('does not update an unchanged membership', () => {
    expect(membershipChanges(membership, 'original-plan', '2026-10-01')).toEqual({});
  });
});
