import { api } from "@/services/api-client";
import type { Paginated, Salon } from "@/types/models";

export type SalonListQuery = {
  page: number;
  limit: number;
  search?: string;
  franchiseId?: string;
  city?: string;
  isActive?: boolean;
};

export function listSalons(query: SalonListQuery) {
  return api.get<Paginated<Salon>>("/salons", {
    params: {
      page: query.page,
      limit: query.limit,
      search: query.search?.trim() || undefined,
      city: query.city?.trim() || undefined,
      franchiseId: query.franchiseId || undefined,
      // Send as explicit strings — some stacks drop/coerce boolean `false` in query params.
      ...(query.isActive === undefined
        ? {}
        : { isActive: query.isActive ? "true" : "false" }),
    },
  });
}

export function getSalon(id: string) {
  return api.get<Salon>(`/salons/${id}`);
}

export function updateSalonStatus(id: string, isActive: boolean) {
  return api.patch<Salon>(`/salons/${id}/status`, { isActive });
}

export function saveSalonCoordinates(id: string, latitude: number, longitude: number) {
  return api.patch<Salon>(`/salons/${id}/location`, {
    latitude,
    longitude,
  });
}

/**
 * Server-side geocoding (the provider key never leaves the backend). With no
 * body the backend geocodes the salon's stored address.
 */
export function geocodeSalon(
  id: string,
  input: { address?: string; placeId?: string },
) {
  const body: Record<string, string> = {};
  if (input.address?.trim()) body.address = input.address.trim();
  if (input.placeId?.trim()) body.placeId = input.placeId.trim();
  return api.post<Salon>(`/salons/${id}/geocode`, body);
}

export async function listSalonPickerOptions(
  activeOnly = true,
): Promise<Pick<Salon, 'id' | 'name'>[]> {
  const options: Pick<Salon, 'id' | 'name'>[] = [];
  let page = 1;
  while (true) {
    const result = await api.get<Paginated<Pick<Salon, 'id' | 'name'>>>('/salons/picker', { params: {
      page,
      limit: 100,
      isActive: activeOnly ? 'true' : undefined,
    } });
    options.push(...result.data);
    if (page >= result.meta.totalPages) return options;
    page++;
  }
}
