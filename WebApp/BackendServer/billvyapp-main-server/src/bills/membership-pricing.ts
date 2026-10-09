import { BadRequestException } from '@nestjs/common';
import {
  moneyCents,
  centsString,
  lineTaxCents,
} from '../common/security/financial-integrity';

export type BenefitConfiguration = {
  couponUsageLimit?: number | null;
  benefitType: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';
  discountPercentage: number | null;
  freeServiceLimit: number | null;
  freeServicesPerVisit?: boolean;
  eligibleServices: { id: string; name: string }[];
};
export function requireBenefitConfiguration(config: BenefitConfiguration) {
  if (config.benefitType === 'NONE' || !config.eligibleServices.length)
    throw new BadRequestException(
      'Membership plan has no configured pricing benefit. Open Memberships → Plans → Edit and configure the benefit type, allowance or percentage, and eligible services.',
    );
  if (
    config.benefitType === 'FREE_SERVICES' &&
    !config.freeServicesPerVisit &&
    (!Number.isInteger(config.freeServiceLimit) ||
      Number(config.freeServiceLimit) < 1)
  )
    throw new BadRequestException(
      'Membership free-service allowance is not configured',
    );
  if (
    config.benefitType === 'PERCENTAGE_DISCOUNT' &&
    (config.discountPercentage == null ||
      !Number.isFinite(config.discountPercentage) ||
      config.discountPercentage < 0 ||
      config.discountPercentage > 100)
  )
    throw new BadRequestException(
      'Membership discount percentage is not configured',
    );
}

/** Amounts are rounded to cents per line, matching the existing billing convention. */
export function priceMembershipLines<
  T extends {
    itemType: string;
    serviceId: string | null;
    quantity: number;
    unitPrice: string;
    discount: string;
    taxRate: string;
  },
>(lines: T[], config: BenefitConfiguration, usedUnits: number, usedVisits = 0) {
  requireBenefitConfiguration(config);
  const exhausted =
    config.couponUsageLimit != null && usedVisits >= config.couponUsageLimit;
  if (
    config.freeServicesPerVisit &&
    (!Number.isInteger(config.couponUsageLimit) ||
      Number(config.couponUsageLimit) < 1)
  )
    throw new BadRequestException(
      'Free services per visit require a positive visit cap',
    );
  const visitServices = new Set<string>();
  const eligible = new Set(config.eligibleServices.map((s) => s.id));
  let remaining = Math.max(0, (config.freeServiceLimit ?? 0) - usedUnits);
  return lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      throw new BadRequestException('Invalid membership line quantity');
    const originalCents =
      moneyCents(line.unitPrice, 'membership unit price') * line.quantity;
    centsString(originalCents);
    const manualCents = moneyCents(line.discount, 'membership line discount');
    const baseCents = originalCents - manualCents;
    if (baseCents < 0)
      throw new BadRequestException('Line discount exceeds line amount');
    let membershipUnits = 0;
    let benefitCents = 0;
    if (
      !exhausted &&
      line.itemType === 'SERVICE' &&
      line.serviceId &&
      eligible.has(line.serviceId)
    ) {
      if (config.benefitType === 'FREE_SERVICES') {
        membershipUnits = config.freeServicesPerVisit
          ? visitServices.has(line.serviceId)
            ? 0
            : Math.min(line.quantity, 1)
          : Math.min(line.quantity, remaining);
        visitServices.add(line.serviceId);
        if (!config.freeServicesPerVisit) remaining -= membershipUnits;
        // Spread an existing line discount evenly across its quantity.
        benefitCents = Number(
          (BigInt(baseCents) * BigInt(membershipUnits) * 2n +
            BigInt(line.quantity)) /
            (BigInt(line.quantity) * 2n),
        );
      } else {
        benefitCents = lineTaxCents(
          baseCents,
          Number(config.discountPercentage),
        );
        membershipUnits = benefitCents > 0 ? line.quantity : 0;
      }
    }
    const lineNet = (baseCents - benefitCents) / 100;
    const taxAmountNum =
      lineTaxCents(baseCents - benefitCents, Number(line.taxRate)) / 100;
    centsString(
      baseCents - benefitCents + moneyCents(taxAmountNum, 'membership tax'),
    );
    return {
      ...line,
      membershipDiscount: (benefitCents / 100).toFixed(2),
      membershipUnits,
      membershipBenefit: membershipUnits > 0,
      lineNet,
      taxAmountNum,
      taxAmount: taxAmountNum.toFixed(2),
      total: (lineNet + taxAmountNum).toFixed(2),
    };
  });
}
