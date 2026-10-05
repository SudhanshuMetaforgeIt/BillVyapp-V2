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

function zeroMetrics(): DashboardMetric[] {
  return [
    {
      id: 'camp-total',
      label: 'Total Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: true,
    },
    {
      id: 'camp-active',
      label: 'Active Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: true,
    },
    {
      id: 'camp-upcoming',
      label: 'Upcoming Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: true,
    },
    {
      id: 'camp-completed',
      label: 'Completed Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: true,
    },
  ];
}

/**
 * Campaigns are not implemented on the backend yet (no Prisma model / routes).
 * Return an honest empty payload so the UI matches the mockup without inventing data.
 */
export async function fetchCampaignsPage(
  params: CampaignsListParams,
): Promise<CampaignsPageData> {
  const statusMap: Record<string, string | undefined> = { active: 'ACTIVE', upcoming: 'SCHEDULED', completed: 'COMPLETED', draft: 'DRAFT' };
  const result = await api.get<Paginated<Campaign>>('/campaigns', { params: { page: params.page, limit: params.limit, search: params.search || undefined, status: statusMap[params.statusTab] } });
  const count = (status: string) => result.data.filter((campaign) => campaign.status === status).length;
  return {
    rows: result.data.map((campaign) => ({ campaign, id: campaign.id, name: campaign.name, description: campaign.description ?? '', typeLabel: campaign.type, typeTone: 'promotion', periodLabel: campaign.startDate && campaign.endDate ? `${new Date(campaign.startDate).toLocaleDateString()} – ${new Date(campaign.endDate).toLocaleDateString()}` : 'Not scheduled', audienceLabel: campaign.targetAudience.replaceAll('_', ' '), status: campaign.status === 'SCHEDULED' ? 'upcoming' : campaign.status.toLowerCase() as CampaignStatusTab, statusLabel: campaign.status })),
    meta: result.meta,
    metrics: [{ ...zeroMetrics()[0], value: String(result.meta.total), rawValue: result.meta.total, comparisonLabel: 'campaigns' }, { ...zeroMetrics()[1], value: String(count('ACTIVE')), rawValue: count('ACTIVE'), comparisonLabel: 'active now' }, { ...zeroMetrics()[2], value: String(count('SCHEDULED')), rawValue: count('SCHEDULED'), comparisonLabel: 'scheduled' }, { ...zeroMetrics()[3], value: String(count('COMPLETED')), rawValue: count('COMPLETED'), comparisonLabel: 'completed' }],
    summary: [
      { status: 'Active', count: 0, tone: 'success' },
      { status: 'Upcoming', count: 0, tone: 'warning' },
      { status: 'Completed', count: 0, tone: 'neutral' },
      { status: 'Draft', count: 0, tone: 'muted' },
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
