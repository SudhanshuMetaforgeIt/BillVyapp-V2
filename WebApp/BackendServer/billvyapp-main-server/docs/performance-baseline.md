# Local performance baseline — Phase 0

No indexes, Redis result caching, or workload changes are part of this phase.
The baseline is **after** the earlier picker/search/lazy-loading changes; it cannot reconstruct their before-state.

## Collection

- Backend `.env`: `PERFORMANCE_BASELINE=true`. Restart the local Nest server.
- Frontend `.env.local`: `NEXT_PUBLIC_PERFORMANCE_BASELINE=true`. Restart Next if the environment change is not picked up.
- Visit `http://localhost:3001`. To export after each journey, run `window.billvyBaseline?.download()` in the browser console. The browser collector is bounded to 10,000 samples, and resets on a full reload.
- Backend metrics are written every five seconds to `.performance/backend.json`, with a rolling maximum of 2,000 samples per metric. Restart the server for a fresh run; copy snapshots between runs.
- Run `node --env-file=.env scripts/baseline-queues.cjs` from the backend directory at the start, during workload, and at the end. Copy each `.performance/queues.json` snapshot before the next run.
- Run `node scripts/baseline-summary.cjs` to freeze the current backend snapshot and generate `.performance/baseline.md` with endpoint percentile and payload tables.
- Output directories are ignored by Git. Exports omit request bodies, SQL, Redis arguments, tokens, query strings, and provider URLs. Review before sharing.

## Repeatable workloads

Record date, git commit, OS/CPU/RAM, Node version, viewport, browser, dataset size, concurrent users, and whether routes have already compiled. Use the same test accounts and dataset for comparisons. Separate first compilation, warm compilation, first data load, and warm query-cache runs. Development tooling and profiling add overhead.

| Journey | Workload and metrics |
|---|---|
| Login | Fresh browser session; login once, then reload with the session. Document TTFB; auth/refresh/me counts and latency. Do not repeatedly submit invalid credentials to manufacture percentiles. |
| Super Admin Dashboard | Open and revisit; API/resource counts, JS encoded and decoded bytes, DB query distribution, React commit render duration. |
| Customer Dashboard | Open and revisit using a Customer test session; API counts, observed cache availability/staleness, render duration. |
| Salon browsing | List, search, paginate, open a detail/gallery; API and image resource timing. Current customer browsing has no geolocation flow: geolocation latency is N/A. |
| Appointments | List, filter, paginate, revisit; query latency and refetch count. Use a controlled second-session update to measure freshness behaviour. |
| Billing/POS | Select disposable customer/services, create bill and record test payment; API latency and explicitly timed transaction span. Do not use real customer transactions. |
| Reports | Generate and download a fixed date range with known row count. API duration measures current synchronous report generation. There is no report worker currently, so queue wait/worker duration are N/A. |
| Media | Use a disposable test image of a fixed size; initiation API, direct upload resource, confirmation API, and image load resource timing. Cross-origin resource sizes/timing may be unavailable without Timing-Allow-Origin. |

Run at least 30 successful samples per frequently used read endpoint for an initial distribution. Prefer 100+ for tail-latency comparisons; always show sample count. A p99 from a small sample is effectively the slowest observation, not a robust tail estimate. Keep failures and successful responses separate. No timing targets or speedup claims are established yet.

## Metric meanings and limits

- `api:*:ms`: backend middleware entry to response finish, grouped by method, route template, and status. Browser resource duration also includes frontend proxy/network overhead.
- `responseBytes`: Content-Length where present; absent for some streaming responses. This is payload length, not total wire bytes.
- `db:query:ms`: SQL driver query duration, including driver/pool wait where applicable. Query text and parameters are never collected. Priority 1 replaced the original Prisma event collector with a driver-adapter wrapper that also counts SQL rows and isolates concurrent request contexts. Treat these timings as a new baseline; see `api-database-profiling.md`.
- `redis:*:ms`: commands through RedisService, including wait/retry time. BullMQ's separate Redis connections are not covered by this hook.
- `external:*:ms`: OpenCage/Google geocoding and Cloudinary HTTP calls until response headers. Response-body decoding and SDK-based S3 calls are not covered.
- `queue:*:waitMs`: time until an attempt starts, excluding configured delay; retries can include time since original enqueue. `workerMs` includes failed attempts. Queue depth is a point-in-time sample.
- CPU percentage is relative to one CPU core, backend process only; memory is backend Node memory. Browser/Next process CPU and memory require DevTools/OS sampling and are pending.
- Browser exports contain document TTFB, API/resource counts, payload sizes where exposed, resource timings, and downloaded JS bytes. These are **dev assets**, not production bundle analysis; cached resources may have zero transfer bytes.
- React Profiler durations measure render work, not total navigation or browser paint time. LCP/INP/CLS are document-level Web Vitals; INP needs interaction and final values may require a visibility change. They are not automatically attributable to each SPA route.
- Query-cache observations record whether a mounted observer has data and whether the query is stale. They are not a literal Redis hit/miss or an exact query-cache hit ratio.
- Bill creation/update and payment creation/update have dedicated transaction wall-time spans (including pool acquisition and transaction callbacks). S3 SDK/provider durations, image on-screen display after decode, and detailed upload phases still require dedicated spans or DevTools capture before those cells are considered measured.

## Current measured queue snapshot

Captured 2026-10-05 at 15:26 IST:

| Queue | Waiting | Active | Delayed | Failed | Completed |
|---|---:|---:|---:|---:|---:|
| notifications | 0 | 0 | 0 | 0 | 13 |
| audit-log-purge | 0 | 0 | 1 | 0 | 1 |

These are actual local queue counts, not worker timing samples. Report generation is synchronous and there is no registered PDF worker in the current source. Authenticated journey results are pending a signed-in browser and controlled workloads.

## Completion gate

Phase 0 completes only when each applicable journey has exported evidence, endpoint percentile sample counts, and a baseline table. Unavailable metrics are marked pending/N/A with the reason. Make subsequent optimization decisions from that table; do not infer results from instrumentation being installed.
