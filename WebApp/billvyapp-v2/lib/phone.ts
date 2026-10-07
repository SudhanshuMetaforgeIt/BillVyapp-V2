import { getBusinessRegion } from './business-region';
export type PhoneCountry = 'IN' | 'US';
export function phoneCallingCode(
  country: PhoneCountry = getBusinessRegion().phoneCountry,
) {
  return country === 'US' ? '+1' : '+91';
}
export function cleanPhoneInput(value: string) {
  return value.trim().replace(/[\s().-]/g, '');
}
export function isValidPhoneInput(value: string) {
  const input = cleanPhoneInput(value);
  return (
    /^(?:\d{10}|\+[1-9]\d{7,14})$/.test(input) &&
    (!input.startsWith('+91') || input.length === 13) &&
    (!input.startsWith('+1') || input.length === 12)
  );
}
export function normalizePhone(
  value: string,
  country: PhoneCountry = getBusinessRegion().phoneCountry,
) {
  const input = cleanPhoneInput(value);
  return input.startsWith('+') ? input : `${phoneCallingCode(country)}${input}`;
}
export function maskPhone(value: string) {
  const phone = normalizePhone(value);
  return `${phone.startsWith('+91') ? '+91' : phone.startsWith('+1') ? '+1' : '+'} ••••••${phone.slice(-4)}`;
}
