import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';

export const ENROLLMENT_PLAN_SELECT = {
  couponUsageLimit: true,
  termsAndConditions: true,
  benefitType: true,
  discountPercentage: true,
  freeServiceLimit: true,
  freeServicesPerVisit: true,
  id: true,
  salonId: true,
  name: true,
  description: true,
  price: true,
  durationDays: true,
  isActive: true,
  benefits: true,
  enrollmentThreshold: true,
  couponPrefix: true,
  salon: { select: { franchise: { select: { code: true } } } },
  eligibleServices: { select: { id: true, name: true } },
} as const;
type EnrollmentPlan = Prisma.MembershipPlanGetPayload<{
  select: typeof ENROLLMENT_PLAN_SELECT;
}>;

export const MEMBERSHIP_COUPON_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateMembershipCoupon(franchiseCode: string): string {
  if (!/^[A-Z0-9]{1,50}$/.test(franchiseCode))
    throw new BadRequestException(
      'Franchise code must be uppercase alphanumeric',
    );
  const suffix = Array.from(
    { length: 6 },
    () =>
      MEMBERSHIP_COUPON_ALPHABET[randomInt(MEMBERSHIP_COUPON_ALPHABET.length)],
  ).join('');
  return `${franchiseCode}-${suffix}`;
}

export function membershipTerms(plan: Omit<EnrollmentPlan, 'salon'>) {
  return {
    couponUsageLimit: plan.couponUsageLimit ?? null,
    termsAndConditions: plan.termsAndConditions ?? null,
    benefitType: plan.benefitType ?? 'NONE',
    discountPercentage: plan.discountPercentage?.toString() ?? null,
    freeServiceLimit: plan.freeServiceLimit ?? null,
    freeServicesPerVisit: plan.freeServicesPerVisit ?? false,
    name: plan.name,
    description: plan.description ?? null,
    price: plan.price.toString(),
    durationDays: plan.durationDays,
    benefits: plan.benefits ?? null,
    enrollmentThreshold: plan.enrollmentThreshold?.toString() ?? null,
    eligibleServices: plan.eligibleServices ?? [],
  };
}

/** UTC date-only validity follows the existing Membership duration convention. */
export function membershipEndDate(startDate: Date, durationDays: number): Date {
  const end = new Date(startDate);
  end.setUTCDate(end.getUTCDate() + durationDays);
  if (!Number.isFinite(end.getTime()) || end.getUTCFullYear() > 9999)
    throw new BadRequestException(
      'Membership expiry exceeds the supported calendar range',
    );
  return end;
}

/** MySQL permits retry after a unique-index rejection; all writes remain in the caller transaction. */
export async function issueMembership(
  tx: Prisma.TransactionClient,
  plan: EnrollmentPlan,
  customerId: string,
  startDate: Date,
  qualifyingBillId?: string,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await tx.membership.create({
        data: {
          customerId,
          membershipPlanId: plan.id,
          qualifyingBillId,
          startDate,
          endDate: membershipEndDate(startDate, plan.durationDays),
          status: 'ACTIVE',
          couponCode: generateMembershipCoupon(plan.salon.franchise.code),
          planSnapshot: membershipTerms(plan),
        },
      });
    } catch (error) {
      if (!isPrismaUniqueError(error) || attempt === 4) throw error;
      if (qualifyingBillId) {
        const issued = await tx.membership.findUnique({
          where: { qualifyingBillId },
        });
        if (issued) return issued;
      }
    }
  }
  throw new Error('Unable to issue a unique membership coupon');
}
