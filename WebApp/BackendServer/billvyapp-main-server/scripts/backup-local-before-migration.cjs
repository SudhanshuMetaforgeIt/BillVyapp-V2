/* Local-only encrypted backup before applying the existing financial migration. */
require('dotenv').config({ quiet: true });
const { spawn } = require('node:child_process');
const { randomBytes, createCipheriv } = require('node:crypto');
const { mkdirSync, writeFileSync, createWriteStream } = require('node:fs');
const { join, resolve } = require('node:path');
const { pipeline } = require('node:stream/promises');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if ((process.env.NODE_ENV || 'development') !== 'development' ||
      !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/billvyapp_v2') {
    throw new Error('Only the local development database is allowed');
  }
  const directory = resolve('.local-backups');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, '.gitignore'), '*\n');
  const name = `before-financial-migration-${Date.now()}`;
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const outputPath = join(directory, `${name}.sql.aes`);
  const child = spawn(process.env.MYSQLDUMP_PATH || 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe', [
    '--host', url.hostname, '--port', url.port || '3306', '--user', decodeURIComponent(url.username),
    '--single-transaction', '--quick', '--hex-blob', '--no-tablespaces', '--set-gtid-purged=OFF',
    url.pathname.slice(1),
  ], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.resume();
  const completion = new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolveExit() : reject(new Error('Database backup failed')));
  });
  await Promise.all([pipeline(child.stdout, cipher, createWriteStream(outputPath, { flags: 'wx' })), completion]);
  writeFileSync(join(directory, `${name}.recovery.json`), JSON.stringify({ algorithm: 'aes-256-gcm', key: key.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }), { flag: 'wx' });
  console.log('PASS encrypted local backup created in .local-backups (excluded from Git); preserve its recovery file privately');
}
main().catch(() => { console.error('Local backup failed; migration must not proceed'); process.exitCode = 1; });
