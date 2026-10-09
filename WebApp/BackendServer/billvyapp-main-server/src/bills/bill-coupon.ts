import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { moneyCents } from '../common/security/financial-integrity';

type CouponClient = Pick<Prisma.TransactionClient, 'membership'>;
/** Identity and plan-configured pricing; never parse the human-readable benefits text. */
export async function requireBillCoupon(
  client: CouponClient,
  input: {
    couponCode: string;
    salonId: string;
    customerId: string;
  },
) {
  const member = await client.membership.findFirst({
    where: {
      couponCode: input.couponCode.trim().toUpperCase(),
      customerId: input.customerId,
      membershipPlan: { salonId: input.salonId },
    },
    select: {
      membershipPlanId: true,
      id: true,
      couponCode: true,
      startDate: true,
      endDate: true,
      status: true,
      planSnapshot: true,
      qualifyingBill: {
        select: { status: true, total: true, paidAmount: true },
      },
      customer: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
      membershipPlan: {
        select: {
          price: true,
          enrollmentThreshold: true,
          couponUsageLimit: true,
          termsAndConditions: true,
          benefitType: true,
          discountPercentage: true,
          freeServiceLimit: true,
          freeServicesPerVisit: true,
          name: true,
          benefits: true,
          eligibleServices: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!member)
    throw new BadRequestException(
      'Coupon is not valid for this customer and salon',
    );
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (
    member.status !== 'ACTIVE' ||
    member.startDate > today ||
    member.endDate < today
  ) {
    throw new BadRequestException(
      'Membership coupon is inactive, expired, or not yet valid',
    );
  }
  const terms = member.planSnapshot as {
    price?: string;
    enrollmentThreshold?: string | null;
    name?: string;
    termsAndConditions?: string | null;
    benefits?: string | null;
    eligibleServices?: { id: string; name: string }[];
  } | null;
  if (member.qualifyingBill) {
    if (
      member.qualifyingBill.status !== 'COMPLETED' ||
      moneyCents(member.qualifyingBill.paidAmount, 'qualifying bill paid') <
        moneyCents(member.qualifyingBill.total, 'qualifying bill total')
    )
      throw new BadRequestException(
        'Membership qualifying bill is not fully settled',
      );
  } else if (
    moneyCents(
      terms?.price ?? member.membershipPlan.price,
      'membership price',
    ) > 0 ||
    (terms && 'enrollmentThreshold' in terms
      ? terms.enrollmentThreshold
      : member.membershipPlan.enrollmentThreshold) != null
  ) {
    throw new BadRequestException(
      'Membership payment or qualification evidence is missing; review enrollment with the salon',
    );
  }
  return {
    couponUsageLimit: member.membershipPlan.couponUsageLimit ?? null,
    termsAndConditions:
      terms?.termsAndConditions ??
      member.membershipPlan.termsAndConditions ??
      null,
    benefitType: member.membershipPlan.benefitType ?? 'NONE',
    discountPercentage:
      member.membershipPlan.discountPercentage == null
        ? null
        : Number(member.membershipPlan.discountPercentage),
    freeServiceLimit: member.membershipPlan.freeServiceLimit ?? null,
    freeServicesPerVisit: member.membershipPlan.freeServicesPerVisit ?? false,
    membershipId: member.id,
    membershipPlanId: member.membershipPlanId,
    customer: member.customer
      ? { id: member.customer.id, ...member.customer.user }
      : null,
    couponCode: member.couponCode,
    membershipName: terms?.name ?? member.membershipPlan.name,
    benefits: terms ? (terms.benefits ?? null) : member.membershipPlan.benefits,
    eligibleServices: member.membershipPlan.eligibleServices,
    startDate: member.startDate.toISOString().slice(0, 10),
    endDate: member.endDate.toISOString().slice(0, 10),
  };
}
