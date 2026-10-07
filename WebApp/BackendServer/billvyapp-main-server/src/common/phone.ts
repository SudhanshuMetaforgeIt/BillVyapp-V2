import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export type PhoneCountry = 'IN' | 'US';
export function phoneCountry(preferences: unknown): PhoneCountry {
  return preferences &&
    typeof preferences === 'object' &&
    !Array.isArray(preferences) &&
    (preferences as Record<string, unknown>).phoneCountry === 'US'
    ? 'US'
    : 'IN';
}
export function normalizePhone(
  value: string,
  country: PhoneCountry = 'IN',
): string {
  const input = value.trim();
  if (!/^[+\d\s().-]+$/.test(input))
    throw new BadRequestException('Enter a valid phone number');
  const compact = input.replace(/[\s().-]/g, '');
  if (compact.startsWith('+')) {
    if (!/^\+[1-9]\d{7,14}$/.test(compact))
      throw new BadRequestException('Enter a valid international phone number');
    if (
      (compact.startsWith('+91') && compact.length !== 13) ||
      (compact.startsWith('+1') && compact.length !== 12)
    )
      throw new BadRequestException(
        'Phone number must contain 10 local digits',
      );
    return compact;
  }
  if (!/^\d{10}$/.test(compact))
    throw new BadRequestException(
      'Enter 10 local digits without the country code',
    );
  return `${country === 'US' ? '+1' : '+91'}${compact}`;
}

/** Resolve on writes only. Existing international numbers retain their prefix. */
export async function normalizeFranchisePhone(
  prisma: Pick<PrismaService, 'franchise' | 'salon'>,
  value: string | null | undefined,
  franchiseId?: string | null,
  salonId?: string | null,
): Promise<string | null> {
  if (!value?.trim()) return null;
  if (value.trim().startsWith('+')) return normalizePhone(value);
  let preferences: unknown;
  if (franchiseId)
    preferences = (
      await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: { preferences: true },
      })
    )?.preferences;
  else if (salonId)
    preferences = (
      await prisma.salon.findUnique({
        where: { id: salonId },
        select: { franchise: { select: { preferences: true } } },
      })
    )?.franchise?.preferences;
  return normalizePhone(value, phoneCountry(preferences));
}
