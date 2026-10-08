import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { fetchCampaignsPage } from './campaigns.service';
import type { Campaign } from '../types/campaigns.types';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

describe('Campaign database counts', () => {
  it('uses API totals across pages and statuses while preserving the table filter', async () => {
    const totals: Record<string, number> = {
      ALL: 157, ACTIVE: 120, SCHEDULED: 12, COMPLETED: 15, DRAFT: 8, CANCELLED: 2,
    };
    const campaign: Campaign = {
      id: 'campaign-id', salonId: 'salon-id', name: 'Summer offer', description: null,
      type: 'OFFER', targetAudience: 'ALL_CUSTOMERS', startDate: null, endDate: null,
      status: 'ACTIVE', offerDescription: null, promotionalMediaFileId: null,
      message: null, deliveryChannels: ['IN_APP'], salon: { id: 'salon-id', name: 'Salon' },
      createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
    };
    vi.mocked(api.get).mockImplementation(async (_url, config) => {
      const params = config?.params;
      const total = totals[params.status ?? 'ALL'];
      return {
        data: params.limit === 10 ? [campaign] : [],
        meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
      } as never;
    });

    const data = await fetchCampaignsPage({ page: 2, limit: 10, search: ' offer ', statusTab: 'active' });

    expect(data.rows.map((row) => row.id)).toEqual(['campaign-id']);
    expect(data.meta.page).toBe(2);
    expect(data.meta.total).toBe(120);
    expect(data.metrics.map((metric) => metric.rawValue)).toEqual([157, 120, 12, 15]);
    expect(data.metrics.every((metric) => !metric.comparisonIsPlaceholder)).toBe(true);
    expect(data.summary.map((row) => row.count)).toEqual([120, 12, 15, 8, 2]);
    expect(data.summary.reduce((sum, row) => sum + row.count, 0)).toBe(157);
    expect(api.get).toHaveBeenCalledWith('/campaigns', {
      params: { page: 2, limit: 10, search: 'offer', status: 'ACTIVE' },
    });
    for (const [, config] of vi.mocked(api.get).mock.calls) {
      expect(config?.params.search).toBe('offer');
    }
  });

  it('surfaces count failures instead of showing fabricated zero totals', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Server unavailable'));
    await expect(fetchCampaignsPage({ page: 1, limit: 10, search: '', statusTab: 'all' }))
      .rejects.toThrow('Server unavailable');
  });
});
