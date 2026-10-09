/* Synthetic integration only: explicit guarded URLs, no .env, no application data. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const Redis = require('ioredis');
const { Queue, Worker, QueueEvents } = require('bullmq');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { redisConnectionOptions } = require('../dist/redis/redis-security');
const { CacheService } = require('../dist/redis/cache.service');
const { claimReport, reportClaimWhere } = require('../dist/platform-reports/report-job-security');
const { ReportsProcessor } = require('../dist/platform-reports/reports.processor');
const { AdminReportsService } = require('../dist/platform-reports/admin-reports.service');
const { ReportAnalyticsService } = require('../dist/platform-reports/report-analytics.service');
const { NotificationsService } = require('../dist/notifications/notifications.service');
const { boundedWorkbook } = require('../dist/platform-reports/bounded-workbook');
const ExcelJS = require('exceljs');

const databaseUrl = process.env.REPORT_SECURITY_TEST_DATABASE_URL;
const redisUrl = process.env.REPORT_SECURITY_TEST_REDIS_URL;
if (!databaseUrl || !redisUrl) throw new Error('Explicit test URLs are required');
const dbUrl = new URL(databaseUrl), rUrl = new URL(redisUrl);
if (dbUrl.protocol !== 'mysql:' || dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '33079' || dbUrl.pathname !== '/billvy_security_test_phase5' ||
    rUrl.protocol !== 'redis:' || rUrl.hostname !== '127.0.0.1' || rUrl.port !== '63799' || rUrl.pathname !== '/2')
  throw new Error('Only disposable Phase 5 localhost databases are allowed');
const checks = [];
async function check(name, run) { await run(); checks.push(name); console.log(`PASS ${name}`); }
const connection = { ...redisConnectionOptions(redisUrl), maxRetriesPerRequest: 2, enableOfflineQueue: false };
const redis = new Redis({ ...connection, retryStrategy: null, maxRetriesPerRequest: 1 });
const db = new PrismaService(new ConfigService({ nodeEnv: 'test', database: { url: databaseUrl } }));
let queue, events, worker;
async function main() {
  if (redis.status !== 'ready') await new Promise((resolve, reject) => { redis.once('ready', resolve); redis.once('error', reject); });
  await check('Redis refuses unauthenticated clients and explicit URL selects the correct database', async () => {
    const wrong = new Redis({ host: '127.0.0.1', port: 63799, db: 2, retryStrategy: null, maxRetriesPerRequest: 1 });
    wrong.on('error', () => {});
    try { await assert.rejects(() => wrong.ping(), /NOAUTH|WRONGPASS/); } finally { wrong.disconnect(); }
    assert.equal(await redis.ping(), 'PONG');
  });
  const cache = new CacheService({ client: redis });
  await check('real Redis isolates identities and stale fills after invalidation', async () => {
    const a = { userId: randomUUID(), role: 'ADMIN', franchiseId: randomUUID(), salonId: null };
    const b = { ...a, userId: randomUUID(), franchiseId: randomUUID() };
    const salon = randomUUID();
    const keyA = `cache:catalogue:${salon}:services:${cache.permissionScope(a)}`;
    const keyB = `cache:catalogue:${salon}:services:${cache.permissionScope(b)}`;
    assert.equal(await cache.wrap(keyA, 300, async () => 'tenant-a'), 'tenant-a');
    assert.equal(await cache.wrap(keyB, 300, async () => 'tenant-b'), 'tenant-b');
    let finish;
    const pending = cache.wrap(keyA + ':pending', 300, () => new Promise(resolve => { finish = resolve; }));
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    await cache.invalidateSalonCatalogue(salon); finish('stale'); await pending;
    assert.equal(await cache.wrap(keyA + ':pending', 300, async () => 'fresh'), 'fresh');
    for (const key of await redis.keys(`cache:catalogue:${salon}:*`)) assert.ok(await redis.ttl(key) > 0);
  });
  const franchise = await db.franchise.create({ data: { name: 'Synthetic franchise', code: randomUUID() } });
  const role = await db.role.upsert({ where: { code: 'ADMIN' }, create: { name: 'Admin', code: 'ADMIN' }, update: {} });
  const actor = await db.user.create({ data: { roleId: role.id, franchiseId: franchise.id, firstName: 'Synthetic', lastName: 'User', email: `${randomUUID()}@example.test`, passwordHash: 'inert-test-hash' } });
  const initial = { status: 'Generating', kind: 'FRANCHISE_OVERVIEW', dateFrom: '2026-10-01', dateTo: '2026-10-02' };
  const report = await db.platformReport.create({ data: { name: 'Synthetic report', type: 'FINANCIAL', franchiseId: franchise.id, generatedById: actor.id, dateFrom: new Date('2026-10-01'), dateTo: new Date('2026-10-02'), snapshot: initial } });
  await check('actual MySQL JSON compare-and-swap permits one concurrent claim and one publication', async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => claimReport(db, report.id, initial)));
    const winners = results.filter(result => result.status === 'fulfilled'); assert.equal(winners.length, 1);
    const token = winners[0].value;
    assert.equal((await db.platformReport.updateMany({ where: reportClaimWhere(report.id, 'wrong-token'), data: { snapshot: { status: 'Ready', wrong: true } } })).count, 0);
    assert.equal((await db.platformReport.updateMany({ where: reportClaimWhere(report.id, token), data: { snapshot: { ...initial, status: 'Ready' } } })).count, 1);
    assert.equal(await claimReport(db, report.id, (await db.platformReport.findUnique({ where: { id: report.id } })).snapshot), null);
  });
  await check('persisted report ownership rejects a forged franchise before querying report data', async () => {
    const service = new AdminReportsService(db, { resolveForUser: async () => 'UTC' });
    await assert.rejects(() => service.processBackgroundAdminReport({ reportId: report.id, actorUserId: actor.id, franchiseId: randomUUID(), query: { dateFrom: initial.dateFrom, dateTo: initial.dateTo } }), /scope|ownership/);
    assert.equal((await db.platformReport.findUnique({ where: { id: report.id } })).snapshot.status, 'Ready');
  });
  await check('real MySQL executes bounded scoped analytics including report CTEs', async () => {
    const saRole = await db.role.upsert({ where: { code: 'SUPER_ADMIN' }, create: { name: 'Platform administrator', code: 'SUPER_ADMIN' }, update: {} });
    const sa = await db.user.create({ data: { roleId: saRole.id, firstName: 'Synthetic', lastName: 'Administrator', email: `${randomUUID()}@example.test`, passwordHash: 'inert-test-hash' } });
    const service = new ReportAnalyticsService(db, { resolveForUser: async () => 'UTC', getPlatformTimezone: async () => 'UTC' });
    const result = await service.query({ userId: sa.id, email: sa.email, role: 'SUPER_ADMIN', franchiseId: null, salonId: null, sessionId: null }, { dateFrom: initial.dateFrom, dateTo: initial.dateTo, franchiseId: franchise.id }, true);
    assert.equal(result.scope.franchiseId, franchise.id); assert.equal(Number(result.summary.totalRevenue), 0);
  });
  await check('concurrent notification retries preserve a single SENT timestamp and scheduled work is not sent early', async () => {
    const notification = await db.notification.create({ data: { userId: actor.id, channel: 'EMAIL', notificationType: 'SYNTHETIC', recipient: actor.email, message: 'Synthetic', status: 'QUEUED' } });
    const service = new NotificationsService(db, {}, {}, {});
    await Promise.all(Array.from({ length: 12 }, () => service.processDispatch(notification.id)));
    const first = await db.notification.findUnique({ where: { id: notification.id } });
    assert.equal(first.status, 'SENT'); await service.processDispatch(notification.id);
    assert.equal((await db.notification.findUnique({ where: { id: notification.id } })).sentAt.getTime(), first.sentAt.getTime());
    const future = await db.notification.create({ data: { userId: actor.id, channel: 'EMAIL', notificationType: 'SYNTHETIC', recipient: actor.email, message: 'Synthetic', status: 'QUEUED', scheduledAt: new Date(Date.now() + 60000) } });
    await assert.rejects(() => service.processDispatch(future.id), /due/);
    assert.equal((await db.notification.findUnique({ where: { id: future.id } })).status, 'QUEUED');
  });
  await check('BullMQ validates real delivered job data and duplicate job IDs create one effect', async () => {
    const name = `phase5-synthetic-${randomUUID()}`;
    queue = new Queue(name, { connection }); events = new QueueEvents(name, { connection });
    let processed = 0;
    const processor = new ReportsProcessor({ processBackgroundAdminReport: async () => { processed++; } }, { processBackgroundPlatformReport: async () => { processed++; } });
    worker = new Worker(name, job => processor.process(job), { connection, concurrency: 1 });
    await events.waitUntilReady(); await worker.waitUntilReady();
    const data = { reportId: report.id, actorUserId: actor.id, franchiseId: franchise.id, query: { dateFrom: '2026-10-01', dateTo: '2026-10-02' } };
    const jobs = await Promise.all(Array.from({ length: 8 }, () => queue.add('generate-admin-export', data, { jobId: 'one-stable-job', removeOnComplete: false, attempts: 1 })));
    await jobs[0].waitUntilFinished(events, 15000); assert.equal(processed, 1);
    const invalid = await queue.add('generate-admin-export', { ...data, query: { ...data.query, role: 'SUPER_ADMIN' } }, { attempts: 1 });
    await assert.rejects(() => invalid.waitUntilFinished(events, 15000)); assert.equal(processed, 1);
    assert.equal((await queue.getJobCounts()).completed, 1);
  });
  await check('compiled workbook worker keeps injected labels as text and retains all seven platform sheets', async () => {
    const input = { name: 'Synthetic report', typeLabel: 'Financial', dateFrom: '2026-10-01', dateTo: '2026-10-02', generatedOn: new Date(), generatedBy: '=HYPERLINK("https://evil.test")', franchiseName: null, snapshot: { status: 'Ready', metrics: { totalRevenue: 0 } } };
    const bytes = await boundedWorkbook('platform', input);
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes);
    assert.equal(book.worksheets.length, 7);
    const cell = book.worksheets[0].getCell('E2'); assert.equal(cell.value, input.generatedBy); assert.equal(cell.type, ExcelJS.ValueType.String);
  });
  console.log(JSON.stringify({ passed: checks.length, checks, applicationDatabaseAccessed: false }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (worker) await worker.close(); if (events) await events.close(); if (queue) await queue.close();
  await db.$disconnect(); redis.disconnect();
});
