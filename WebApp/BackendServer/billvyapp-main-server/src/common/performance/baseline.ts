import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export const baselineEnabled = () =>
  process.env.PERFORMANCE_BASELINE === 'true' &&
  process.env.NODE_ENV !== 'production';
const context = new AsyncLocalStorage<{
  dbMs: number;
  redisMs: number;
  externalMs: number;
  queryCount: number;
  rowsReturned: number;
  queries: {
    operation: string;
    durationMs: number;
    rowsReturned: number;
    failed: boolean;
  }[];
  controller?: string;
  handler?: string;
  serviceSpans: { name: string; durationMs: number }[];
}>();
const slowRequests: Record<string, unknown>[] = [];

export function currentRequestProfile() {
  return context.getStore();
}
export function setBaselineRoute(controller: string, handler: string) {
  const current = context.getStore();
  if (current) {
    current.controller = controller;
    current.handler = handler;
  }
}

export function recordDatabaseQuery(
  operation: string,
  durationMs: number,
  rowsReturned: number,
  failed: boolean,
) {
  recordDependency('db', 'query', durationMs);
  const current = context.getStore();
  if (!current) return;
  current.queryCount++;
  current.rowsReturned += rowsReturned;
  if (current.queries.length < 100)
    current.queries.push({ operation, durationMs, rowsReturned, failed });
}
const samples = new Map<string, number[]>();
let timer: NodeJS.Timeout | undefined;
const startedAt = new Date().toISOString();
let previousCpu = process.cpuUsage();
let previousTime = performance.now();
let cpuPercent = 0;

export function recordBaseline(name: string, value: number) {
  if (!baselineEnabled() || !Number.isFinite(value)) return;
  const values = samples.get(name) ?? [];
  if (values.length === 2000) values.shift();
  values.push(value);
  samples.set(name, values);
}

export function recordDependency(
  kind: 'db' | 'redis' | 'external',
  name: string,
  ms: number,
) {
  recordBaseline(`${kind}:${name}:ms`, ms);
  const current = context.getStore();
  if (current) current[`${kind}Ms`] += ms;
}

export function percentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) =>
    sorted.length
      ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]
      : null;
  return { samples: sorted.length, p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}

export async function writeBaseline() {
  const directory = join(process.cwd(), '.performance');
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'backend.json'),
    JSON.stringify(
      {
        startedAt,
        capturedAt: new Date().toISOString(),
        sampleLimitPerMetric: 2000,
        process: {
          pid: process.pid,
          memoryBytes: process.memoryUsage(),
          cpuPercentOneCore: cpuPercent,
        },
        metrics: Object.fromEntries(
          [...samples].map(([name, values]) => [name, percentiles(values)]),
        ),
        slowRequests,
      },
      null,
      2,
    ),
  );
}

export async function measureBaseline<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    const durationMs = performance.now() - start;
    recordBaseline(name, durationMs);
    const current = context.getStore();
    if (current && current.serviceSpans.length < 100)
      current.serviceSpans.push({ name, durationMs });
  }
}

export function startBaseline() {
  if (!baselineEnabled() || timer) return;
  timer = setInterval(() => {
    const now = performance.now();
    const cpu = process.cpuUsage(previousCpu);
    cpuPercent = ((cpu.user + cpu.system) / 1000 / (now - previousTime)) * 100;
    previousCpu = process.cpuUsage();
    previousTime = now;
    void writeBaseline().catch(() => undefined);
  }, 5000);
  timer.unref();
}

export function baselineMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!baselineEnabled()) return next();
  const start = performance.now();
  context.run(
    {
      dbMs: 0,
      redisMs: 0,
      externalMs: 0,
      queryCount: 0,
      rowsReturned: 0,
      queries: [],
      serviceSpans: [],
    },
    () => {
      const totals = context.getStore()!;
      res.once('finish', () => {
        // Route templates only; identity is limited to role and scope IDs below.
        const route = req.route?.path;
        const label = `${req.method} ${typeof route === 'string' ? route : 'unmatched'} ${res.statusCode}`;
        recordBaseline(`api:${label}:ms`, performance.now() - start);
        for (const kind of ['db', 'redis', 'external'] as const)
          recordBaseline(`api:${label}:${kind}Ms`, totals[`${kind}Ms`]);
        const length = res.getHeader('content-length');
        if (length !== undefined)
          recordBaseline(`api:${label}:responseBytes`, Number(length));
        recordBaseline(`api:${label}:queryCount`, totals.queryCount);
        recordBaseline(`api:${label}:rowsReturned`, totals.rowsReturned);
        const durationMs = performance.now() - start;
        const threshold = Number(
          process.env.PERFORMANCE_SLOW_REQUEST_MS ?? 100,
        );
        if (durationMs >= threshold) {
          const user = (req as Request & { user?: AuthenticatedUser }).user;
          if (slowRequests.length === 500) slowRequests.shift();
          slowRequests.push({
            endpoint: typeof route === 'string' ? route : 'unmatched',
            method: req.method,
            status: res.statusCode,
            role: user?.role ?? 'unauthenticated',
            authorizationScope: {
              franchiseId: user?.franchiseId ?? null,
              salonId: user?.salonId ?? null,
            },
            requestedScope: {
              franchiseId:
                typeof req.query.franchiseId === 'string'
                  ? req.query.franchiseId
                  : null,
              salonId:
                typeof req.query.salonId === 'string'
                  ? req.query.salonId
                  : null,
            },
            totalDurationMs: durationMs,
            controller: totals.controller ?? null,
            handler: totals.handler ?? null,
            serviceSpans: totals.serviceSpans,
            databaseDurationMs: totals.dbMs,
            queryCount: totals.queryCount,
            databaseRowsReturned: totals.rowsReturned,
            responseBytes: length !== undefined ? Number(length) : null,
            cache: 'not-configured',
            httpNotModified: res.statusCode === 304,
            queries: totals.queries,
            queriesTruncated: totals.queryCount > totals.queries.length,
          });
        }
      });
      next();
    },
  );
}

export async function baselineFetch(
  provider: string,
  input: string,
  init?: RequestInit,
) {
  const start = performance.now();
  try {
    return await fetch(input, init);
  } finally {
    recordDependency('external', provider, performance.now() - start);
  }
}
