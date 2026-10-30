import type { AnalyticsRow } from '../types/reports.types';

/** One service can have separate aggregates for each branch and customer gender. */
export function analyticsRowKey(row: AnalyticsRow, index: number): string {
  if (row.id == null) return `row:${index}`;
  return JSON.stringify([row.id, row.franchiseId ?? null, row.salonId ?? null, row.gender ?? null]);
}
