import { BadRequestException } from '@nestjs/common';
import { isValidTimeZone } from './datetime/datetime';
import { phoneCountry } from './phone';

export function franchiseRegion(preferences: unknown) {
  const p =
    preferences &&
    typeof preferences === 'object' &&
    !Array.isArray(preferences)
      ? (preferences as Record<string, unknown>)
      : {};
  const currency = p.currency === 'USD' ? 'USD' : 'INR';
  return {
    phoneCountry: phoneCountry(p),
    currency,
    locale: currency === 'USD' ? 'en-US' : 'en-IN',
    dateFormat:
      typeof p.dateFormat === 'string' &&
      ['DD MMM YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(p.dateFormat)
        ? p.dateFormat
        : 'DD MMM YYYY',
    timeFormat: p.timeFormat === '24' ? '24' : '12',
    timezone:
      typeof p.timezone === 'string' && isValidTimeZone(p.timezone)
        ? p.timezone
        : null,
  };
}
export function validateRegionPreferences(
  p: Record<string, string | number | boolean | undefined>,
) {
  if (
    p.phoneCountry !== undefined &&
    !['IN', 'US'].includes(String(p.phoneCountry))
  )
    throw new BadRequestException('Phone country must be IN or US');
  if (p.currency !== undefined && !['INR', 'USD'].includes(String(p.currency)))
    throw new BadRequestException('Currency must be INR or USD');
  if (
    p.timezone !== undefined &&
    (typeof p.timezone !== 'string' || !isValidTimeZone(p.timezone))
  )
    throw new BadRequestException('Choose a valid IANA timezone');
  if (
    p.dateFormat !== undefined &&
    !['DD MMM YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(String(p.dateFormat))
  )
    throw new BadRequestException('Invalid date format');
  if (
    p.timeFormat !== undefined &&
    !['12', '24'].includes(String(p.timeFormat))
  )
    throw new BadRequestException('Time format must be 12 or 24');
}
export function excelCurrencyFormat(currency?: string) {
  return currency === 'USD' ? '"$"#,##0.00' : '"₹"#,##0.00';
}
export function excelDateFormat(format?: string) {
  return format === 'MM/DD/YYYY'
    ? 'mm/dd/yyyy'
    : format === 'YYYY-MM-DD'
      ? 'yyyy-mm-dd'
      : 'dd mmm yyyy';
}
