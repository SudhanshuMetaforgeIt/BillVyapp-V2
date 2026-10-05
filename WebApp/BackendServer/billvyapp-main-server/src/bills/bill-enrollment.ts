import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  ENROLLMENT_PLAN_SELECT,
  issueMembership,
  membershipTerms,
} from '../memberships/membership-enrollment';
import {
  isDateOnlyString,
  parseDateOnlyUtc,
} from '../common/datetime/datetime';
import type { BillEnrollmentDetailsDto } from './dto/create-bill.dto';

export async function requireEnrollmentPlan(
  tx: Prisma.TransactionClient,
  planId: string,
  salonId: string,
  qualifyingAmount: string,
) {
  const plan = await tx.membershipPlan.findFirst({
    where: {
      id: planId,
      salonId,
      isActive: true,
      enrollmentThreshold: { not: null, lte: qualifyingAmount },
    },
    select: ENROLLMENT_PLAN_SELECT,
  });
  if (!plan)
    throw new BadRequestException(
      'Selected membership plan no longer qualifies for this bill',
    );
  return plan;
}
export function validateEnrollmentDetails(
  details?: BillEnrollmentDetailsDto | null,
) {
  if (
    !details?.nameConfirmed ||
    typeof details.whatsappSameAsBilling !== 'boolean'
  )
    throw new BadRequestException(
      'Confirm customer name and WhatsApp number for enrollment',
    );
  if (!details.whatsappSameAsBilling && !details.whatsappNumber)
    throw new BadRequestException('Enter the customer WhatsApp number');
  if (
    details.dateOfBirth &&
    (!isDateOnlyString(details.dateOfBirth) ||
      parseDateOnlyUtc(details.dateOfBirth) > new Date())
  )
    throw new BadRequestException('Date of birth must be a valid past date');
  return details;
}
export function enrollmentConsent(
  details: BillEnrollmentDetailsDto | null | undefined,
  plan: Parameters<typeof membershipTerms>[0],
): Prisma.InputJsonObject {
  return JSON.parse(
    JSON.stringify({
      ...validateEnrollmentDetails(details),
      acceptedTerms: membershipTerms(plan),
      acceptedAt: new Date().toISOString(),
    }),
  ) as Prisma.InputJsonObject;
}
export async function completeChosenEnrollment(
  tx: Prisma.TransactionClient,
  bill: {
    id: string;
    salonId: string;
    customerId: string;
    enrollmentPlanId?: string | null;
    enrollmentDetails?: Prisma.JsonValue | null;
    membershipFee?: { toString(): string } | string | number;
    total: { toString(): string };
  },
) {
  if (!bill.enrollmentPlanId) return null;
  await tx.$queryRaw`SELECT id FROM membership_plans WHERE id = ${bill.enrollmentPlanId} FOR UPDATE`;
  const fee = Number(bill.membershipFee ?? 0);
  const plan = await requireEnrollmentPlan(
    tx,
    bill.enrollmentPlanId,
    bill.salonId,
    (Number(bill.total) - fee).toFixed(2),
  );
  if (Number(plan.price) !== fee)
    throw new BadRequestException(
      'Membership price changed; update the draft and confirm with the customer',
    );
  const details = validateEnrollmentDetails(
    bill.enrollmentDetails as unknown as BillEnrollmentDetailsDto,
  );
  await tx.$queryRaw`SELECT id FROM customers WHERE id = ${bill.customerId} FOR UPDATE`;
  const customer = await tx.customer.findUniqueOrThrow({
    where: { id: bill.customerId },
    include: { user: true },
  });
  if (!customer.user.isActive)
    throw new BadRequestException('Customer is inactive');
  if (details.whatsappSameAsBilling && !customer.user.phone)
    throw new BadRequestException(
      'Customer has no billing number; enter a WhatsApp number',
    );
  await tx.customer.update({
    where: { id: customer.id },
    data: {
      whatsappNumber: details.whatsappSameAsBilling
        ? customer.user.phone
        : details.whatsappNumber,
      ...(details.dateOfBirth
        ? { dateOfBirth: parseDateOnlyUtc(details.dateOfBirth) }
        : {}),
    },
  });
  if (details.email?.trim())
    await tx.user.update({
      where: { id: customer.userId },
      data: { email: details.email.trim() },
    });
  if (details.address?.trim()) {
    const address = await tx.customerAddress.findFirst({
      where: { customerId: customer.id, isDefault: true },
    });
    if (address)
      await tx.customerAddress.update({
        where: { id: address.id },
        data: { addressLine1: details.address.trim() },
      });
    else
      await tx.customerAddress.create({
        data: {
          customerId: customer.id,
          addressLine1: details.address.trim(),
          isDefault: true,
        },
      });
  }
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const issued = await issueMembership(tx, plan, customer.id, start, bill.id);
  const consent = bill.enrollmentDetails as Prisma.JsonObject;
  if (consent.acceptedTerms)
    await tx.membership.update({
      where: { id: issued.id },
      data: { planSnapshot: consent.acceptedTerms as Prisma.InputJsonObject },
    });
  return issued;
}
