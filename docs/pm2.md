# Local PM2 process management

Run these commands from the repository root. PM2 is pinned as a project dependency; no global installation is required.

| Command | Purpose |
| --- | --- |
| `npm run build:api` | Compile current backend source |
| `npm run pm2:start` | Start the backend and frontend |
| `npm run pm2:status` | Show process health and restart counts |
| `npm run pm2:logs` | Stream recent backend/frontend logs |
| `npm run pm2:restart -- billvy-api` | Restart only the backend and reread its environment |
| `npm run pm2:restart -- billvy-web` | Restart only the frontend |
| `npm run pm2:stop` | Stop both managed applications |
| `npm run pm2:save` | Save the managed process list |
| `npm run pm2:resurrect` | Restore the saved process list |

Stop the previous manually launched Nest/Next servers before the first `pm2:start`. Ports are fixed: API 3000, frontend 3001. The frontend listens on `0.0.0.0` for local-network access and proxies `/api` to `127.0.0.1:3000`.

The current setup is local development, not production rollout. `billvy-api` runs compiled `dist/main.js` without a compiler watcher. After backend changes, build it and restart only `billvy-api`. Frontend development hot reload remains available through Next itself; PM2 file watching is disabled. One instance of each process avoids duplicate queue consumers and overlapping local scheduler processes.

PM2 restarts crashed processes with backoff and a limit on rapid startup failures. API and frontend memory limits are 1 GB and 2 GB. The API reports readiness after listening, handles Windows PM2 shutdown messages, and runs Nest shutdown hooks for connections and workers. A restart of a single fork process briefly interrupts its requests; PM2 does not provide zero-downtime guarantees in this local setup.

Backend secrets remain in the ignored backend `.env`. They are not copied into ecosystem configuration. PM2 state, logs and saved process snapshots live in ignored `.pm2/` and must not be committed or shared. Use the root command wrapper consistently. PM2 currently uses shared named pipes on Windows, so do not run another independent Windows PM2 daemon with a different PM2 home in the same session.

`pm2:save` does not install Windows boot/login startup. After Windows restarts, run `pm2:resurrect`. Automatic startup can be configured separately with Windows Task Scheduler; Linux service startup will be configured during the production phases. MySQL and Redis remain independently managed dependencies and must be running before the API starts.

Root dependency overrides remove the advisories in PM2's FTP, YAML and file-watching dependencies. Chokidar 4 no longer supports glob watching, so keep PM2 `watch: false` unless its compatibility is reviewed. The root dependency audit is clean; this does not substitute for production review of the separate frontend/backend dependency trees.

References: [PM2 ecosystem configuration](https://pm2.keymetrics.io/docs/usage/application-declaration/), [graceful shutdown and Windows IPC](https://pm2.keymetrics.io/docs/usage/signals-clean-restart/).
