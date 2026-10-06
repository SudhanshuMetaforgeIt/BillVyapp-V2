/** Local development cache windows. Mutations still invalidate affected keys immediately. */
export const QUERY_FRESHNESS = {
  search: 10_000,
  live: 15_000,
  billing: 30_000,
  activity: 30_000,
  dashboard: 45_000,
  reports: 2 * 60_000,
  catalog: 5 * 60_000,
  settings: 5 * 60_000,
} as const;
