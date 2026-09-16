export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function normalizePagination(
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number } {
  const normalizedPage =
    Number.isInteger(page) && (page as number) > 0
      ? (page as number)
      : DEFAULT_PAGE;
  const requested =
    Number.isInteger(limit) && (limit as number) > 0
      ? (limit as number)
      : DEFAULT_LIMIT;
  const normalizedLimit = Math.min(requested, MAX_LIMIT);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
  };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
