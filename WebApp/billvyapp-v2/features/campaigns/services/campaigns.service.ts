import { api } from '@/services/api-client';
import axios from 'axios';
import type { Paginated } from '@/types/models';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  Campaign,
  CampaignInput,
  CampaignStatusTab,
  CampaignsListParams,
  CampaignsPageData,
} from '../types/campaigns.types';

/** Counts use API pagination totals, independent of the selected status and page. */
export async function fetchCampaignsPage(
  params: CampaignsListParams,
): Promise<CampaignsPageData> {
  const statusMap: Record<string, string | undefined> = { active: 'ACTIVE', upcoming: 'SCHEDULED', completed: 'COMPLETED', draft: 'DRAFT' };
  const search = params.search.trim() || undefined;
  const [result, total, active, upcoming, completed, draft, cancelled] = await Promise.all([
    api.get<Paginated<Campaign>>('/campaigns', { params: { page: params.page, limit: params.limit, search, status: statusMap[params.statusTab] } }),
    ...[undefined, 'ACTIVE', 'SCHEDULED', 'COMPLETED', 'DRAFT', 'CANCELLED'].map((status) =>
      api.get<Paginated<Campaign>>('/campaigns', { params: { page: 1, limit: 1, search, status } }),
    ),
  ]);
  const metric = (id: string, label: string, count: number, tone: DashboardMetric['tone']): DashboardMetric => ({
    id, label, value: String(count), rawValue: count, comparisonLabel: 'current total',
    changePercent: null, tone, comparisonIsPlaceholder: false,
  });
  return {
    rows: result.data.map((campaign) => ({ campaign, id: campaign.id, name: campaign.name, description: campaign.description ?? '', typeLabel: campaign.type, typeTone: 'promotion', periodLabel: campaign.startDate && campaign.endDate ? `${new Date(campaign.startDate).toLocaleDateString()} – ${new Date(campaign.endDate).toLocaleDateString()}` : 'Not scheduled', audienceLabel: campaign.targetAudience.replaceAll('_', ' '), status: campaign.status === 'SCHEDULED' ? 'upcoming' : campaign.status.toLowerCase() as CampaignStatusTab, statusLabel: campaign.status })),
    meta: result.meta,
    metrics: [
      metric('camp-total', 'Total Campaigns', total.meta.total, 'accent'),
      metric('camp-active', 'Active Campaigns', active.meta.total, 'success'),
      metric('camp-upcoming', 'Upcoming Campaigns', upcoming.meta.total, 'neutral'),
      metric('camp-completed', 'Completed Campaigns', completed.meta.total, 'neutral'),
    ],
    summary: [
      { status: 'Active', count: active.meta.total, tone: 'success' },
      { status: 'Upcoming', count: upcoming.meta.total, tone: 'warning' },
      { status: 'Completed', count: completed.meta.total, tone: 'neutral' },
      { status: 'Draft', count: draft.meta.total, tone: 'muted' },
      { status: 'Cancelled', count: cancelled.meta.total, tone: 'muted' },
    ],
    apiUnavailable: false,
  };
}
export const createCampaign = (input: CampaignInput) => api.post<Campaign>('/campaigns', input);
export const publishCampaign = (id: string, status: 'SCHEDULED' | 'ACTIVE') => api.post<Campaign>(`/campaigns/${id}/publish`, { status });
export const cancelCampaign = (id: string) => api.post<Campaign>(`/campaigns/${id}/cancel`);
export const getCampaign = (id: string) => api.get<Campaign>(`/campaigns/${id}`);
export const updateCampaign = (id: string, input: Partial<CampaignInput>) => api.patch<Campaign>(`/campaigns/${id}`, input);
export const deleteCampaign = (id: string) => api.delete<{ id: string; deleted: true }>(`/campaigns/${id}`);
export async function uploadCampaignImage(salonId: string, file: File): Promise<string> {
  const upload = await api.post<{ id: string; uploadUrl: string }>('/media/upload-url', { originalFileName: file.name, mimeType: file.type || 'application/octet-stream', fileSize: file.size, salonId, entityType: 'CAMPAIGN' });
  try { await axios.put(upload.uploadUrl, file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }); }
  catch { await api.delete(`/media/${upload.id}`).catch(() => undefined); throw new Error('The image could not be uploaded.'); }
  await api.post(`/media/${upload.id}/confirm`);
  return upload.id;
}
export const getMediaDownloadUrl = (id: string) => api.get<{ downloadUrl: string }>(`/media/${id}/download-url`);
