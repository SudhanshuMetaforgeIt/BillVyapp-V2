import { api } from '@/services/api-client';
import type {
  CreateLoyaltyInput,
  LoyaltyBalance,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  Paginated,
} from '@/types/models';

export type LoyaltyQuery = {
  page: number;
  limit: number;
  customerId?: string;
  salonId?: string;
  transactionType?: LoyaltyTransactionType;
};

export function listLoyalty(query: LoyaltyQuery) {
  return api.get<Paginated<LoyaltyTransaction>>('/loyalty', {
    params: {
      ...query,
      customerId: query.customerId || undefined,
      salonId: query.salonId || undefined,
      transactionType: query.transactionType || undefined,
    },
  });
}

/** CUSTOMER callers get their own balance; the backend ignores customerId for them. */
export function getLoyaltyBalance(customerId?: string) {
  return api.get<LoyaltyBalance>('/loyalty/balance', {
    params: { customerId: customerId || undefined },
  });
}

export function createLoyaltyTransaction(input: CreateLoyaltyInput) {
  return api.post<LoyaltyTransaction>('/loyalty', input);
}
