export const AUDIT_LOG_PURGE_QUEUE = 'audit-log-purge';

/** Default retention when platform_settings row is missing. */
export const DEFAULT_LOG_RETENTION_DAYS = 90;

/** BullMQ job name for the daily retention purge. */
export const AUDIT_LOG_PURGE_JOB = 'purge-expired';

/** Cron: every day at 03:00 server local time. */
export const AUDIT_LOG_PURGE_CRON = '0 3 * * *';
