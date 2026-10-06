const { readFile, writeFile, mkdir } = require('node:fs/promises');
const format = value => value == null ? 'pending' : value.toFixed(2);
async function main() {
  const data = JSON.parse(await readFile('.performance/backend.json', 'utf8'));
  const lines = ['# Exploratory local baseline', '', `Captured: ${data.capturedAt}`, '',
    'These are rolling observations of local traffic, not controlled journey runs. Low sample counts do not establish reliable p95/p99.', '',
    '| Endpoint/status | Samples | p50 ms | p95 ms | p99 ms | p50 payload bytes |',
    '|---|---:|---:|---:|---:|---:|'];
  for (const [key, metric] of Object.entries(data.metrics)) {
    if (!key.startsWith('api:') || !key.endsWith(':ms')) continue;
    const payload = data.metrics[key.slice(0, -2) + 'responseBytes'];
    lines.push(`| ${key.slice(4, -3)} | ${metric.samples} | ${format(metric.p50)} | ${format(metric.p95)} | ${format(metric.p99)} | ${payload?.p50 ?? 'not available'} |`);
  }
  lines.push('', '| Dependency/span | Samples | p50 ms | p95 ms | p99 ms |', '|---|---:|---:|---:|---:|');
  for (const [key, metric] of Object.entries(data.metrics)) {
    if (!/^(db|redis|external|transaction|report|queue):/.test(key)) continue;
    lines.push(`| ${key} | ${metric.samples} | ${format(metric.p50)} | ${format(metric.p95)} | ${format(metric.p99)} |`);
  }
  lines.push('', `Backend RSS: ${(data.process.memoryBytes.rss / 1048576).toFixed(1)} MiB. CPU last sampling interval: ${format(data.process.cpuPercentOneCore)}% of one core.`, '',
    'Pending: controlled per-journey counts, browser export, LCP/INP/CLS, frontend/Next CPU and memory, checkout/upload workloads, and worker timing samples.');
  await mkdir('.performance', { recursive: true });
  await writeFile('.performance/baseline.md', lines.join('\n'));
  await writeFile('.performance/backend-snapshot.json', JSON.stringify(data, null, 2));
  console.log('Saved .performance/baseline.md and backend-snapshot.json');
}
main().catch(() => { console.error('Baseline summary unavailable. Start the instrumented backend and exercise the app first.'); process.exitCode = 1; });
