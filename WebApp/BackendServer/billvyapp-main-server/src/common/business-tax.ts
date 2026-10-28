import { BadRequestException } from '@nestjs/common';

/** Service tax is owned by the business; bill items retain their saved rate. */
export function businessTaxRate(preferences: unknown): number {
  const value = preferences && typeof preferences === 'object'
    ? (preferences as Record<string, unknown>).defaultTaxRate
    : undefined;
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) {
    throw new BadRequestException('Business tax rate must be between 0 and 100 with at most two decimal places');
  }
  return value;
}

export const BUSINESS_TAX_SELECT = {
  salon: { select: { franchise: { select: { preferences: true } } } },
} as const;

export type BusinessTaxSource = {
  salon?: { franchise: { preferences: unknown } };
};

export function serviceTaxRate(service: BusinessTaxSource): number {
  return businessTaxRate(service.salon?.franchise.preferences);
}
