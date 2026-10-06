# Priority 1: API and database profiling

## Slow request records

Set `PERFORMANCE_BASELINE=true` in the backend environment. `PERFORMANCE_SLOW_REQUEST_MS` defaults to 100 milliseconds. `.performance/backend.json` contains the latest 500 slow requests plus rolling endpoint percentiles.

Each record includes route template, HTTP method/status, controller/handler, authenticated role, authorization franchise/salon IDs, separately labelled requested franchise/salon filters, total request wall time, summed SQL driver time, query count, rows returned by SQL statements, response Content-Length when available, and instrumented service spans.

The MariaDB driver adapter is wrapped for both regular and transaction queries. AsyncLocalStorage isolates concurrent requests. The wrapper forwards the original SQL and argument objects unchanged and preserves result/error behaviour. Query identities contain the SQL operation plus a hash of the SQL template, allowing repeated statement patterns to be spotted without storing SQL, bind parameters, row contents, credentials, or customer data.

Summed database time can exceed elapsed request time when queries overlap. It includes driver/pool wait where applicable, not just MySQL execution time. Rows are SQL result rows: a COUNT returns one row, and a relation represented as a JSON column may contain more entities. Transaction control/connection acquisition outside queryRaw/executeRaw is not counted as a data query. Billing/payment transaction wall-time spans remain separate.

There is currently no application response/query result cache registered. Cache status is `not-configured`; Redis OTP state and BullMQ are not query-result caches. HTTP 304 is recorded separately and does **not** mean database work was skipped. Missing Content-Length is null, not zero. Service spans currently cover explicitly instrumented billing/payment/report operations; other service method names are not inferred.

Authorization scope is taken from the authenticated request, never from client filters. Requested scope is diagnostic input, not evidence of permission. Telemetry does not replace the RBAC/ScopeService checks or prove all SQL predicates were correctly applied; scoped service regression tests remain required. Scope IDs are recorded locally; `.performance` is ignored by Git and should be reviewed before sharing.

The prior baseline used Prisma query event timing. The new driver timings include additional driver overhead and must be treated as a new baseline, not compared directly to old DB timing values.

## First query optimization

The measured report-list path performed a separate total count and a grouped type count with the **same where filters**. The total now sums the grouped counts. This removes one SQL aggregation per report-list request while retaining the response fields, same filters, pagination, transaction boundary, and SUPER_ADMIN controller authorization. Empty and multiple-group totals are tested.

Local EXPLAIN plans are saved by `node --env-file=.env scripts/explain-report-queries.cjs` to `.performance/report-explain.json`. The local fixture had approximately eight report rows: count and type summary used the existing type index; the ordered listing chose a scan/filesort. A scan on a tiny table does not justify a new index. These plans represent the corresponding SQL patterns, not a captured production workload. No indexes were added.

## Next evidence to collect

Repeat scoped report, appointments, bills, and salon requests with fixed filters and realistic local fixture sizes. Inspect slow-request query fingerprints for repetition and large result sets. Obtain actual production query patterns before making production index decisions; production credentials/data were not supplied for this sprint. Do not use Promise.all inside a transaction as a presumed SQL parallelism optimization: the transaction uses one connection. Independent operations outside transactions can be assessed separately when consistency permits.
