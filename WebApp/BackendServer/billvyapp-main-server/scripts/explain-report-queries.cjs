const mariadb = require('mariadb');
const { mkdir, writeFile } = require('node:fs/promises');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const connection = await mariadb.createConnection({ host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
    port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
  try {
    const plans = [];
    const scopes = [{ name: 'platform', where: '', args: [] }];
    const franchises = await connection.query('SELECT id FROM franchises ORDER BY id LIMIT 1');
    if (franchises.length) scopes.push({ name: 'franchise', where: ' WHERE franchiseId = ?', args: [franchises[0].id] });
    for (const scope of scopes) {
      for (const [name, sql] of [
        ['redundant-count', `SELECT COUNT(*) FROM platform_reports${scope.where}`],
        ['existing-type-summary', `SELECT type, COUNT(*) FROM platform_reports${scope.where} GROUP BY type ORDER BY type ASC`],
        ['history-pagination', `SELECT id, name, type, createdAt FROM platform_reports${scope.where} ORDER BY createdAt DESC LIMIT 20`],
      ]) {
        const plan = await connection.query(`EXPLAIN ${sql}`, scope.args);
        plans.push({ scope: scope.name, name, sql, plan });
      }
    }
    await mkdir('.performance', { recursive: true });
    await writeFile('.performance/report-explain.json', JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'local development; not production evidence', plans }, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    console.log('Saved local EXPLAIN plans to .performance/report-explain.json');
  } finally { await connection.end(); }
}
main().catch(() => { console.error('EXPLAIN failed. Check local database configuration. No credentials printed.'); process.exitCode = 1; });
