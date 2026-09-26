import { api } from '@/services/api-client';
import type { Paginated, SearchEntityType, SearchHit } from '@/types/models';

export function globalSearch(input: {
  q: string;
  types?: SearchEntityType[];
  page?: number;
  limit?: number;
}) {
  return api.get<Paginated<SearchHit>>('/search', {
    params: {
      q: input.q.trim(),
      types: input.types && input.types.length > 0 ? input.types.join(',') : undefined,
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    },
  });
}
