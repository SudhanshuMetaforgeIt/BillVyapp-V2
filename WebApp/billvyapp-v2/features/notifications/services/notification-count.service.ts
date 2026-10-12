import { api } from '@/services/api-client';
import type { AuthUser } from '@/types/user.types';

/** Count received messages awaiting a read acknowledgement, without downloading the inbox. */
export async function fetchUnreadNotificationCount(user: Pick<AuthUser, 'id' | 'role'> | null): Promise<number> {
  if (!user) return 0;
  const response = await api.get<{ meta: { total: number } }>('/notifications', {
    params: {
      page: 1,
      limit: 1,
      status: 'DELIVERED',
      // Customer ownership is resolved by the server's customer scope.
      ...(user.role === 'CUSTOMER' ? {} : { userId: user.id }),
    },
  });
  return Number.isSafeInteger(response.meta.total) && response.meta.total >= 0 ? response.meta.total : 0;
}
