/**
 * Mirrors the Prisma `MembershipStatus` enum. Kept as a TS enum so DTOs can
 * validate without importing the generated Prisma client.
 */
export enum MembershipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const TERMINAL_MEMBERSHIP_STATUSES: MembershipStatus[] = [
  MembershipStatus.EXPIRED,
  MembershipStatus.CANCELLED,
];

export const MEMBERSHIP_STATUS_TRANSITIONS: Record<
  MembershipStatus,
  MembershipStatus[]
> = {
  [MembershipStatus.PENDING]: [
    MembershipStatus.ACTIVE,
    MembershipStatus.CANCELLED,
  ],
  [MembershipStatus.ACTIVE]: [
    MembershipStatus.EXPIRED,
    MembershipStatus.CANCELLED,
  ],
  [MembershipStatus.EXPIRED]: [],
  [MembershipStatus.CANCELLED]: [],
};
