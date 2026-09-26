import { api } from '@/services/api-client';
import type { AuditLog, Paginated } from '@/types/models';

export type AuditLogQuery = {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  salonId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

function clean<T extends Record<string, unknown>>(query: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  ) as Partial<T>;
}

export function listAuditLogs(query: AuditLogQuery) {
  return api.get<Paginated<AuditLog>>('/audit-logs', { params: clean(query) });
}

export function getAuditLog(id: string) {
  return api.get<AuditLog>(`/audit-logs/${id}`);
}
