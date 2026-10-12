import { api } from '@/services/api-client';
export type LoyaltyPolicy = { enabled: boolean; spendAmount: number; pointsPerSpend: number; minimumRedeemPoints: number };
export type LoyaltyQuote = LoyaltyPolicy & { balance: number; canRedeem: boolean; pointValue: number };
export const getLoyaltySettings = () => api.get<LoyaltyPolicy>('/loyalty/settings');
export const saveLoyaltySettings = (policy: LoyaltyPolicy) => api.patch<LoyaltyPolicy>('/loyalty/settings', policy);
export const getLoyaltyQuote = (salonId: string, customerId: string) => api.get<LoyaltyQuote>('/loyalty/quote', { params: { salonId, customerId } });
export const redeemLoyalty = (billId: string, points: number, idempotencyKey: string) => api.post(`/payments/loyalty/${billId}`, { points, idempotencyKey });
