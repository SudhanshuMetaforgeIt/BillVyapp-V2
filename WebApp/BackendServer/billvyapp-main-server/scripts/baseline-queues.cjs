const { Queue } = require('bullmq');
const { mkdir, writeFile } = require('node:fs/promises');

async function main() {
  const address = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  const connection = { host: address.hostname, port: Number(address.port || 6379),
    username: address.username ? decodeURIComponent(address.username) : undefined,
    password: address.password ? decodeURIComponent(address.password) : undefined,
    db: Number(address.pathname.slice(1) || 0), ...(address.protocol === 'rediss:' ? { tls: {} } : {}) };
  const queues = ['notifications', 'audit-log-purge'].map(name => new Queue(name, { connection }));
  try {
    const counts = {};
    for (const queue of queues) counts[queue.name] = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed');
    await mkdir('.performance', { recursive: true });
    await writeFile('.performance/queues.json', JSON.stringify({ capturedAt: new Date().toISOString(), counts,
      reports: 'Not queued in current implementation', pdf: 'No PDF worker registered in current implementation' }, null, 2));
    console.log('Saved .performance/queues.json');
  } finally { await Promise.all(queues.map(queue => queue.close())); }
}
main().catch(() => { console.error('Queue measurement failed. Check local Redis configuration.'); process.exitCode = 1; });
