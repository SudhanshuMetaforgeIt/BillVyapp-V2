import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { fetchUnreadNotificationCount } from './notification-count.service';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); });

describe('Notification bell count', () => {
  it('counts the entire personal unread inbox using metadata, not the downloaded row count', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'one-row' }], meta: { total: 128 } });
    expect(await fetchUnreadNotificationCount({ id: 'manager-id', role: 'MANAGER' })).toBe(128);
    expect(api.get).toHaveBeenCalledWith('/notifications', { params: {
      page: 1, limit: 1, status: 'DELIVERED', userId: 'manager-id',
    } });
  });
  it('uses server-derived customer ownership instead of a creator user filter', async () => {
    vi.mocked(api.get).mockResolvedValue({ meta: { total: 3 } });
    expect(await fetchUnreadNotificationCount({ id: 'customer-id', role: 'CUSTOMER' })).toBe(3);
    expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, limit: 1, status: 'DELIVERED' } });
  });
  it('returns zero without a request after logout', async () => {
    expect(await fetchUnreadNotificationCount(null)).toBe(0);
    expect(api.get).not.toHaveBeenCalled();
  });
  it('reflects read acknowledgements on the next refresh', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ meta: { total: 1 } }).mockResolvedValueOnce({ meta: { total: 0 } });
    const user = { id: 'admin-id', role: 'ADMIN' as const };
    expect(await fetchUnreadNotificationCount(user)).toBe(1);
    expect(await fetchUnreadNotificationCount(user)).toBe(0);
  });
});
