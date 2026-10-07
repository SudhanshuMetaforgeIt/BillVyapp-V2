import { useAuthStore } from '@/stores/auth.store';

export function getBusinessRegion() {
  const user = useAuthStore.getState().user;
  const currency = user?.currency === 'USD' ? 'USD' : 'INR';
  return {
    phoneCountry:
      user?.phoneCountry === 'US' ? ('US' as const) : ('IN' as const),
    currency,
    locale: currency === 'USD' ? 'en-US' : 'en-IN',
    dateFormat: user?.dateFormat ?? 'DD MMM YYYY',
    hour12: user?.timeFormat !== '24',
  };
}
export function getCurrencySymbol() {
  return getBusinessRegion().currency === 'USD' ? '$' : '₹';
}
export const BUSINESS_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India — Asia/Kolkata' },
  { value: 'America/New_York', label: 'US Eastern — America/New_York' },
  { value: 'America/Chicago', label: 'US Central — America/Chicago' },
  { value: 'America/Denver', label: 'US Mountain — America/Denver' },
  { value: 'America/Los_Angeles', label: 'US Pacific — America/Los_Angeles' },
  { value: 'America/Phoenix', label: 'US Arizona — America/Phoenix' },
  { value: 'America/Anchorage', label: 'US Alaska — America/Anchorage' },
  { value: 'Pacific/Honolulu', label: 'US Hawaii — Pacific/Honolulu' },
  { value: 'UTC', label: 'UTC' },
];
