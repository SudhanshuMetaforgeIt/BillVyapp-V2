import { api } from '@/services/api-client';
import type { Paginated, StockMovement, StockMovementType } from '@/types/models';

export type StockMovementQuery = {
  page: number;
  limit: number;
  salonId?: string;
  productId?: string;
  movementType?: StockMovementType;
};

export function listStockMovements(query: StockMovementQuery) {
  return api.get<Paginated<StockMovement>>('/inventory/movements', {
    params: {
      ...query,
      salonId: query.salonId || undefined,
      productId: query.productId || undefined,
      movementType: query.movementType || undefined,
    },
  });
}
