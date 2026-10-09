import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** DECIMAL(12,2), expressed as safe integer cents. INR and USD both use two decimals. */
export const MAX_MONEY = 9_999_999_999.99;
export function moneyCents(
  value: number | string | { toString(): string },
  field: string,
  signed = false,
): number {
  const amount = value == null ? NaN : Number(value.toString());
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    (!signed && amount < 0) ||
    Math.abs(amount) > MAX_MONEY ||
    Math.abs(amount * 100 - cents) > 0.0001 ||
    !Number.isSafeInteger(cents)
  ) {
    throw new BadRequestException(
      `${field} must be a finite amount with at most two decimal places within the supported range`,
    );
  }
  return cents;
}
export function centsString(cents: number): string {
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > MAX_MONEY * 100)
    throw new BadRequestException(
      'Calculated amount exceeds the supported range',
    );
  return (cents / 100).toFixed(2);
}
export function lineTaxCents(netCents: number, rate: number): number {
  const rateHundredths = moneyCents(rate, 'taxRate');
  if (rate > 100)
    throw new BadRequestException('taxRate must be between 0 and 100');
  // Integer half-up rounding avoids floating point multiplication at the cent boundary.
  return Number((BigInt(netCents) * BigInt(rateHundredths) + 5000n) / 10000n);
}
export function requireRequestKey(value?: string): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9:_-]{7,190}$/.test(value)
  )
    throw new BadRequestException(
      'A stable idempotencyKey (8–191 characters) is required',
    );
  return value;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}
export function financialRequestHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
export function assertSameFinancialRequest(
  stored: string | null | undefined,
  requested: string,
): void {
  if (stored !== requested)
    throw new ConflictException(
      'Idempotency key was already used for a different financial request',
    );
}
export function requireCurrency(value: unknown): 'INR' | 'USD' {
  if (value == null) return 'INR';
  if (value !== 'INR' && value !== 'USD')
    throw new BadRequestException('Unsupported billing currency');
  return value;
}

/** Counter payments store terminal/bank references, never card credentials. */
export function assertNoRawCardData(
  notes?: string | null,
  reference?: string | null,
  card = false,
): void {
  const text = `${notes ?? ''} ${reference ?? ''}`;
  if (
    /\b(cvv|cvc|security\s*code|card\s*(number|expiry|expiration))\s*[:=]?\s*\d/i.test(
      text,
    )
  )
    throw new BadRequestException(
      'Do not submit card numbers, expiry or security codes',
    );
  const candidates: string[] = notes?.match(/(?:\d[ -]?){13,19}/g) ?? [];
  if (card && reference && /^[\d -]{13,25}$/.test(reference))
    candidates.push(reference);
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) continue;
    let sum = 0;
    for (let i = digits.length - 1, position = 0; i >= 0; i--, position++) {
      let digit = Number(digits[i]);
      if (position % 2) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    if (sum % 10 === 0)
      throw new BadRequestException('Do not submit raw card numbers');
  }
}
