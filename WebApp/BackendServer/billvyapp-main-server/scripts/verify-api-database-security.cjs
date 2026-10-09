/* Disposable MySQL integration checks. Does not load .env or use application data. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const mariadb = require('mariadb');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { DatabaseBackupService } = require('../dist/settings/database-backup.service');
const { mkdtemp, readFile, readdir, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, dirname, basename, resolve } = require('node:path');
const { existsSync } = require('node:fs');
const { randomUUID } = require('node:crypto');

const explicit = process.env.API_SECURITY_TEST_DATABASE_URL;
if (!explicit) throw new Error('API_SECURITY_TEST_DATABASE_URL is required');
const url = new URL(explicit);
if (url.protocol !== 'mysql:' || url.hostname !== '127.0.0.1' || url.port !== '33079' ||
    !/^\/billvy_security_test_phase4$/.test(url.pathname)) throw new Error('Only the dedicated disposable localhost test database is allowed');
const clients = [];
const result = [];
async function check(name, run) { await run(); result.push(name); console.log(`PASS ${name}`); }
function runtime(user, tlsMode = 'disabled') {
  const connection = new URL(explicit); connection.username = user; connection.password = 'synthetic-test-password';
  const db = new PrismaService(new ConfigService({ nodeEnv: 'production', database: { url: connection.toString(), tlsMode } }));
  clients.push(db); return db;
}
async function main() {
  const administrator = await mariadb.createConnection({ host: url.hostname, port: Number(url.port), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: url.pathname.slice(1), allowPublicKeyRetrieval: true });
  try {
    // The disposable server enables native authentication only for these test accounts.
    // This avoids permitting unauthenticated RSA-key retrieval in the production connector.
    await administrator.query("CREATE USER IF NOT EXISTS 'billvy_security_runtime'@'%' IDENTIFIED WITH mysql_native_password BY 'synthetic-test-password'");
    await administrator.query('GRANT SELECT, INSERT, UPDATE, DELETE ON `billvy_security_test_phase4`.* TO \'billvy_security_runtime\'@\'%\'');
    await administrator.query("CREATE USER IF NOT EXISTS 'billvy_security_wide'@'%' IDENTIFIED WITH mysql_native_password BY 'synthetic-test-password'");
    await administrator.query("GRANT SELECT ON *.* TO 'billvy_security_wide'@'%'");
    const db = runtime('billvy_security_runtime');
    await check('production runtime accepts scoped CRUD and denies schema/system access', async () => {
      await db.onModuleInit();
      const record = await db.franchise.create({ data: { name: 'Synthetic scope', code: randomUUID() } });
      await db.franchise.update({ where: { id: record.id }, data: { name: 'Updated scope' } });
      assert.equal((await db.franchise.findUnique({ where: { id: record.id } })).name, 'Updated scope');
      await assert.rejects(() => db.$executeRaw`CREATE TABLE forbidden_runtime_ddl(id int)`);
      await assert.rejects(() => db.$queryRaw`SELECT User FROM mysql.user`);
      await db.franchise.delete({ where: { id: record.id } });
    });
    const initialCount = await db.franchise.count();
    const payload = "' OR 1=1; DROP TABLE franchises; --";
    const a = await db.franchise.create({ data: { name: payload, code: randomUUID() } });
    const b = await db.franchise.create({ data: { name: 'Other tenant', code: randomUUID() } });
    await check('Prisma injection strings remain literal and cannot bypass tenant filters', async () => {
      const rows = await db.franchise.findMany({ where: { AND: [{ id: a.id }, { name: { contains: payload } }] }, take: 10 });
      assert.deepEqual(rows.map(r => r.id), [a.id]);
      assert.equal(await db.franchise.count({ where: { id: b.id + payload } }), 0);
    });
    await check('tagged raw SQL binds injection payloads as values', async () => {
      const rows = await db.$queryRaw`SELECT id FROM franchises WHERE id = ${a.id} AND name = ${payload}`;
      assert.deepEqual(rows.map(r => r.id), [a.id]);
      assert.equal(await db.franchise.count(), initialCount + 2);
    });
    await check('production startup rejects an overbroad database grant', async () => {
      const wide = runtime('billvy_security_wide');
      await assert.rejects(() => wide.onModuleInit(), /privileges/);
    });
    await check('verified TLS rejects the disposable self-signed server certificate', async () => {
      const tls = runtime('billvy_security_runtime', 'required');
      await assert.rejects(() => tls.$queryRaw`SELECT 1`);
    });
    await check('encrypted full-database backup restores synthetic data and invalidates sessions', async () => {
      const directory = await mkdtemp(join(tmpdir(), 'billvy-phase4-backup-'));
      const mysqlDirectory = 'C:/Program Files/MySQL/MySQL Server 8.4/bin';
      for (const [variable, executable] of [['MYSQL_CLIENT_PATH', 'mysql.exe'], ['MYSQLDUMP_PATH', 'mysqldump.exe']]) {
        const path = join(mysqlDirectory, executable);
        if (existsSync(path)) process.env[variable] = path;
      }
      const state = new Map([['security:session:synthetic', 'active'], ['otp:login:synthetic', 'challenge']]);
      const client = {
        set: async (key, value) => { state.set(key, value); return 'OK'; },
        del: async (...keys) => { for (const key of keys) state.delete(key); },
        eval: async (_sql, _count, key) => state.delete(key),
        scan: async (_cursor, _match, pattern) => ['0', [...state.keys()].filter(k => k.startsWith(pattern.slice(0, -1)))],
        incr: async key => { const next = Number(state.get(key) || 0) + 1; state.set(key, String(next)); return next; },
      };
      const service = new DatabaseBackupService(new ConfigService({ database: { url: explicit, backupRoot: directory,
        backupEncryptionKey: Buffer.alloc(32, 9).toString('base64') } }), { record: async () => {} }, { client });
      try {
        const actor = { userId: randomUUID(), role: 'SUPER_ADMIN' }, ctx = { ipAddress: '127.0.0.1', userAgent: 'synthetic backup verification' };
        const backup = await service.createBackup(actor, ctx);
        const encrypted = await readFile(join(directory, `${backup.id}.sql`));
        assert.equal(encrypted.subarray(0, 9).toString(), 'BILLVYDB1');
        assert.equal(encrypted.toString().includes('CREATE TABLE'), false);
        await db.franchise.create({ data: { name: 'Post-backup synthetic record', code: randomUUID() } });
        assert.equal(await db.franchise.count(), initialCount + 3);
        await service.restoreBackup(actor, { confirm: true, confirmationPhrase: 'RESTORE', backupId: backup.id }, ctx);
        assert.equal(await db.franchise.count(), initialCount + 2);
        assert.equal(state.has('security:session:synthetic'), false);
        assert.equal(state.has('otp:login:synthetic'), false);
        assert.equal((await readdir(directory)).some(name => /\.(restore|verify|partial|encrypted)$/.test(name)), false);
      } finally {
        if (resolve(dirname(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('billvy-phase4-backup-')) throw new Error('Unexpected cleanup directory');
        await rm(directory, { recursive: true, force: true });
      }
    });
    console.log(JSON.stringify({ passed: result.length, checks: result, productionDatabaseAccessed: false }, null, 2));
  } finally { await administrator.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.allSettled(clients.map(db => db.$disconnect()));
});
