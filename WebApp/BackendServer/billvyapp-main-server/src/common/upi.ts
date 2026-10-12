import { BadRequestException } from '@nestjs/common';

export const UPI_ID_PATTERN =
  /^[a-zA-Z0-9._-]{2,190}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
export function normalizeUpiId(
  value: string | null | undefined,
): string | null {
  const id = value?.trim() || null;
  if (id && !UPI_ID_PATTERN.test(id))
    throw new BadRequestException('Enter a valid UPI ID, such as shop@bank');
  return id;
}
