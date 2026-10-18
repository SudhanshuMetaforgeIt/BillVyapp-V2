// Use the project-local PM2 binary/state. Never load application secrets here.
const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = path.join(root, 'ecosystem.config.js');
const action = process.argv[2];
const target = process.argv[3];
if (process.argv.length > 4 || (target && !['billvy-api', 'billvy-web'].includes(target))) {
  console.error('Optional target must be billvy-api or billvy-web'); process.exit(1);
}
const commands = {
  start: ['start', config], restart: ['restart', config, '--update-env'],
  stop: ['stop', config], status: ['list'], logs: ['logs', '--lines', '50'],
  save: ['save'], resurrect: ['resurrect'],
};
const args = commands[action];
if (!args) { console.error('Unsupported PM2 action'); process.exit(1); }
if (target) {
  if (['start', 'restart', 'stop'].includes(action)) args.push('--only', target);
  else if (action === 'logs') args.splice(1, 0, target);
  else { console.error('This action does not accept an application target'); process.exit(1); }
}
if (action === 'start' && !existsSync(path.join(root, 'WebApp', 'BackendServer', 'billvyapp-main-server', 'dist', 'main.js'))) {
  console.error('Build the backend first: npm run build:api'); process.exit(1);
}
const pm2Home = path.join(root, '.pm2');
mkdirSync(pm2Home, { recursive: true });
const env = { ...process.env, PM2_HOME: pm2Home };
const result = spawnSync(process.execPath, [require.resolve('pm2/bin/pm2'), ...args], { cwd: root, env, stdio: 'inherit', windowsHide: true });
if (result.error) { console.error('Could not launch PM2:', result.error.code); process.exit(1); }
process.exit(result.status ?? 1);
