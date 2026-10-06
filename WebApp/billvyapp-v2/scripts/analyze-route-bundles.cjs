const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = process.cwd();
const mode = process.argv.includes('--build') ? 'build' : 'dev';
const outputRoot = path.join(root, '.next', ...(mode === 'dev' ? ['dev'] : []));
const walk = directory => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]) : [];
const chunks = new Map();
function chunkInfo(relative) {
  relative = relative.replace(/^\/_next\//, '');
  if (chunks.has(relative)) return chunks.get(relative);
  const file = path.resolve(outputRoot, relative);
  if (!file.startsWith(outputRoot + path.sep) || !fs.existsSync(file)) return { path: relative, missing: true, bytes: 0, gzipBytes: 0, packages: [] };
  const buffer = fs.readFileSync(file);
  const packages = new Set();
  const mapFile = file + '.map';
  if (fs.existsSync(mapFile)) {
    const visit = map => {
      for (const source of map.sources || []) {
        const match = source.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
        if (match) packages.add(match[1]);
      }
      for (const section of map.sections || []) visit(section.map);
    };
    visit(JSON.parse(fs.readFileSync(mapFile, 'utf8')));
  }
  const info = { path: relative, bytes: buffer.length, gzipBytes: zlib.gzipSync(buffer).length, packages: [...packages].sort(), missing: false };
  chunks.set(relative, info); return info;
}

const routes = [];
for (const file of walk(path.join(outputRoot, 'server', 'app')).filter(file => file.endsWith('page_client-reference-manifest.js'))) {
  const scope = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), scope, { timeout: 1000 });
  for (const [key, manifest] of Object.entries(scope.__RSC_MANIFEST || {})) {
    const route = key.replace(/\/page$/, '') || '/';
    const references = [...new Set(Object.values(manifest.entryJSFiles || {}).flat())].filter(file => file.endsWith('.js'));
    const entries = references.map(chunkInfo);
    routes.push({ route, bytes: entries.reduce((sum, chunk) => sum + chunk.bytes, 0), gzipBytes: entries.reduce((sum, chunk) => sum + chunk.gzipBytes, 0), chunks: references, missingChunks: entries.filter(chunk => chunk.missing).map(chunk => chunk.path), packages: [...new Set(entries.flatMap(chunk => chunk.packages))].sort() });
  }
}
routes.sort((a, b) => b.bytes - a.bytes);
const pages = walk(path.join(root, 'app')).filter(file => /[\\/]page\.tsx$/.test(file)).map(file => '/' + path.relative(path.join(root, 'app'), file).replace(/\\/g, '/').replace(/(^|\/)page\.tsx$/, '')).map(route => route.replace(/\/$/, '') || '/');
const missingRoutes = pages.filter(route => !routes.some(item => item.route === route));
for (let index = routes.length - 1; index >= 0; index--) if (!pages.includes(routes[index].route)) routes.splice(index, 1);
const common = routes.length ? routes[0].chunks.filter(chunk => routes.every(route => route.chunks.includes(chunk))) : [];
const data = { capturedAt: new Date().toISOString(), mode, note: 'Manifest-referenced client JS including inherited layouts. Excludes source maps, HMR runtime not referenced by entryJSFiles, separately loaded async chunks, HTML/RSC and images. Gzip is an estimate, not measured transfer. Package lists indicate presence only, not byte attribution.', routes, commonChunks: common.map(chunkInfo), chunks: [...chunks.values()].sort((a, b) => b.bytes - a.bytes), missingRoutes };
const kib = bytes => (bytes / 1024).toFixed(1);
const markdown = [`# JavaScript per route — ${mode}`, '', `Captured: ${data.capturedAt}`, '', data.note, '', `Analyzed ${routes.length} routes; ${missingRoutes.length} source routes have no manifest.`, '', '| Route | JS KiB | Estimated gzip KiB | Chunks |', '|---|---:|---:|---:|', ...routes.map(route => `| ${route.route} | ${kib(route.bytes)} | ${kib(route.gzipBytes)} | ${route.chunks.length} |`), '', '## Largest chunks', '', '| Chunk | JS KiB | Gzip KiB | Package presence |', '|---|---:|---:|---|', ...data.chunks.slice(0, 20).map(chunk => `| ${chunk.path} | ${kib(chunk.bytes)} | ${kib(chunk.gzipBytes)} | ${chunk.packages.join(', ')} |`), '', '## Missing routes', '', ...missingRoutes.map(route => `- ${route}`), ''];
fs.mkdirSync(path.join(root, '.performance'), { recursive: true });
fs.writeFileSync(path.join(root, '.performance', `route-bundles-${mode}.json`), JSON.stringify(data, null, 2));
fs.writeFileSync(path.join(root, '.performance', `route-bundles-${mode}.md`), markdown.join('\n'));
console.log(JSON.stringify({ mode, analyzedRoutes: routes.length, missingRoutes: missingRoutes.length, largestRoutes: routes.slice(0, 8).map(({ route, bytes, gzipBytes }) => ({ route, kib: kib(bytes), gzipKib: kib(gzipBytes) })) }, null, 2));
