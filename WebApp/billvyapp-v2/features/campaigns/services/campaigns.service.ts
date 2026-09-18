import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { api } from '@/services/api-client';
import type {
  AdminCampaignsResult,
  CampaignItem,
  CampaignsFilterState,
  CampaignStats,
  CampaignStatus,
  CreateCampaignPayload,
} from '../types/campaigns.types';

type RawSalon = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

const STORAGE_KEY = 'billvy_franchise_campaigns';

function getStoredCampaigns(): CampaignItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredCampaigns(items: CampaignItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function fetchAdminCampaigns(
  filters: Partial<CampaignsFilterState> = {},
): Promise<AdminCampaignsResult> {
  // Fetch branches from backend
  const salonsRes = await api.get<{ data: RawSalon[] }>('/salons', {
    params: { page: 1, limit: 100 },
  }).catch(() => ({ data: [] }));

  const rawSalons = Array.isArray(salonsRes.data) ? salonsRes.data : [];
  const branches = rawSalons.map((s) => ({ id: s.id, name: s.name }));
  const salonMap = new Map(branches.map((b) => [b.id, b.name]));

  const allCampaigns = getStoredCampaigns();

  // Filter campaigns
  let filtered = allCampaigns;

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.type.toLowerCase().includes(term),
    );
  }

  if (filters.branchId && filters.branchId !== 'all') {
    filtered = filtered.filter(
      (c) => !c.salonId || c.salonId === filters.branchId,
    );
  }

  if (filters.statusTab && filters.statusTab !== 'ALL') {
    filtered = filtered.filter((c) => c.status === filters.statusTab);
  }

  // Calculate stats across all campaigns
  const totalCount = allCampaigns.length;
  let activeCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;
  let draftCount = 0;

  for (const c of allCampaigns) {
    if (c.status === 'ACTIVE') activeCount++;
    else if (c.status === 'UPCOMING') upcomingCount++;
    else if (c.status === 'COMPLETED') completedCount++;
    else if (c.status === 'DRAFT') draftCount++;
  }

  const calcPct = (cnt: number, tot: number) =>
    tot > 0 ? Number(((cnt / tot) * 100).toFixed(1)) : 0;

  const stats: CampaignStats = {
    totalCampaigns: totalCount,
    totalCampaignsSubtitle: totalCount > 0 ? 'Across all branches' : 'No data yet',
    activeCampaigns: activeCount,
    activeCampaignsPct: calcPct(activeCount, totalCount),
    upcomingCampaigns: upcomingCount,
    upcomingCampaignsPct: calcPct(upcomingCount, totalCount),
    completedCampaigns: completedCount,
    completedCampaignsPct: calcPct(completedCount, totalCount),
    draftCampaigns: draftCount,
  };

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));

  return {
    campaigns: paginated,
    stats,
    total: filtered.length,
    totalPages,
    branches,
  };
}

export async function createCampaign(
  payload: CreateCampaignPayload,
): Promise<CampaignItem> {
  const allCampaigns = getStoredCampaigns();

  let formattedPeriod = '—';
  try {
    const s = parseISO(payload.startDate);
    const e = parseISO(payload.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      formattedPeriod = `${format(s, 'MMM dd')} - ${format(e, 'MMM dd, yyyy')}`;
    }
  } catch {
    formattedPeriod = `${payload.startDate} - ${payload.endDate}`;
  }

  let status: CampaignStatus = payload.status || 'ACTIVE';
  const now = new Date();
  try {
    const s = parseISO(payload.startDate);
    const e = parseISO(payload.endDate);
    if (isAfter(s, now)) {
      status = 'UPCOMING';
    } else if (isBefore(e, now)) {
      status = 'COMPLETED';
    } else {
      status = 'ACTIVE';
    }
  } catch {
    // default
  }

  const newCampaign: CampaignItem = {
    id: `camp_${Date.now()}`,
    name: payload.name.trim(),
    description: payload.description.trim(),
    type: payload.type,
    branchName: payload.salonId ? 'Specific Branch' : 'All Branches',
    salonId: payload.salonId || null,
    period: formattedPeriod,
    startDate: payload.startDate,
    endDate: payload.endDate,
    audience: payload.audience || Math.floor(Math.random() * 500) + 150,
    status,
    createdAt: new Date().toISOString(),
  };

  const updated = [newCampaign, ...allCampaigns];
  saveStoredCampaigns(updated);

  return newCampaign;
}
