const fs = require('node:fs');
async function main() {
  const report = JSON.parse(fs.readFileSync('.performance/route-bundles-dev.json', 'utf8'));
  const routes = process.argv.includes('--all') ? report.routes.map(item => item.route).filter(route => route === '/' || /^\/(auth|dashboard)(\/|$)/.test(route)) : report.missingRoutes;
  for (const route of routes) {
    const url = new URL(route.replace('[salonId]', 'bundle-analysis'), 'http://localhost:3001');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      await response.arrayBuffer();
      console.log(`${route}: HTTP ${response.status}`);
    } catch { console.log(`${route}: compilation request failed`); }
  }
}
main().catch(() => { process.exitCode = 1; });
