const path = require('node:path');
const root = __dirname;
const backend = path.join(root, 'WebApp', 'BackendServer', 'billvyapp-main-server');
const frontend = path.join(root, 'WebApp', 'billvyapp-v2');
const common = {
  interpreter: process.execPath,
  instances: 1,
  exec_mode: 'fork',
  watch: false,
  autorestart: true,
  min_uptime: '15s',
  max_restarts: 10,
  exp_backoff_restart_delay: 1000,
  kill_timeout: 60000,
  time: true,
  merge_logs: true,
};

module.exports = {
  apps: [
    {
      ...common,
      name: 'billvy-api',
      cwd: backend,
      script: path.join(backend, 'dist', 'main.js'),
      max_memory_restart: '1G',
      wait_ready: true,
      listen_timeout: 60000,
      shutdown_with_message: process.platform === 'win32',
      env: { NODE_ENV: 'development', PORT: '3000' },
    },
    {
      ...common,
      name: 'billvy-web',
      cwd: frontend,
      script: path.join(frontend, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: ['dev', '--hostname', '0.0.0.0', '--port', '3001'],
      max_memory_restart: '2G',
      env: { NODE_ENV: 'development', BACKEND_URL: 'http://127.0.0.1:3000' },
    },
  ],
};
