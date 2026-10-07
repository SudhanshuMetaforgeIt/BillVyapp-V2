# Super Admin reporting

The existing `features/reports` module and `platform-reports` controller/service remain the entry points. No schema migration, billing changes, membership mutations, or RBAC expansion is required.

## Data contract

All live sections accept the same inclusive `dateFrom`, `dateTo`, franchise and salon scope. A salon selected under All Franchises infers its parent franchise on the server. Invalid dates and unrelated salon/franchise combinations are rejected. Platform reporting uses the platform business timezone consistently across analytics and exports.

- Revenue: sum of payments whose current status is SUCCESS, filtered by paymentDate instants. Transactions are payment attempts, including split payments; success rate uses all attempts as the denominator.
- User/customer/franchise/salon totals: currently retained records created before the selected range's exclusive end. Current assignments apply; deleted records and historical assignment/status changes cannot be reconstructed.
- Bill-based metrics: COMPLETED bills use billDate calendar labels. Customer spend, average bill, service line totals and membership fees are billed amounts, not payment revenue. Line totals include line discounts/tax; bill-level discounts are not apportioned to services.
- Returning customers: a completed bill in the range plus a completed bill before the range within the selected scope. Multiple first-time bills in the same range do not imply a returning customer.
- Membership fees: actual membershipFee on completed bills. Manual enrollments without a billed fee are not assigned an inferred sale price.
- Active memberships: current ACTIVE status and validity through the selected range end. Historical status transitions are unavailable. Expiry is the day after the inclusive endDate; pending/cancelled records are excluded from expiry counts.
- Redemptions: actual membership_redemptions attached to completed bills. Distinct bill IDs count benefit visits; quantities count benefit units. Creating a coupon is never a redemption.

## Endpoints and isolation

`GET /platform-reports/analytics` accepts section=summary|revenue|business|insights|details, interval=day|week|month|year, salonSort and serviceSort. Aggregation is parameterized SQL plus Prisma counts inside repeatable-read transactions. The browser receives aggregates, not historical raw bills. Chart buckets use timezone-aware UTC bounds computed in application code, including DST; no MySQL timezone table installation is required.

`GET /platform-reports/filter-options` returns franchise/salon names and IDs only. All platform reporting endpoints retain the existing Super Admin controller role guard. The analytics service additionally rejects Admin, Manager, Staff and Customer roles. Their existing reporting permissions are unchanged.

Each section has a separate query/loading/error/retry state. Placeholder data from a previous filter is not displayed as current data. Generated history is independently paginated and scope/type filtered, and visibly retains original snapshot ranges instead of silently filtering by generation date.

Dashboard rankings show the top 50 rows, explicitly labeled. Export snapshots include every aggregated group. Chart requests are bounded to 500 buckets and date ranges to ten years; use a larger interval for long ranges. Existing payment, bill-date, relationship and tenant indexes support the underlying queries. Populations and filters require aggregate/select queries rather than client-side raw-history fetching.

## Generation and exports

The configuration dialog starts with the dashboard's range, interval, sort choices and scope. Applying its configuration updates the dashboard to the same values. Generation captures all sections in a repeatable-read database transaction and persists the analytics and legacy metrics in the existing JSON snapshot. Salon IDs/names, sort choices and interval are added to snapshot metadata without a database migration; original franchise names are preserved when a business is subsequently renamed.

Downloads now return actual ExcelJS-generated XLSX attachments with the supplied seven-sheet reference layout, Calibri typography, blue headers, rupee/percentage formats, native striped tables with filters, merged sections, frozen panes and landscape print settings. The existing generation/history/download routes and frontend blob mechanism are preserved. PDF remains unsupported.

New snapshots additionally capture daily timezone-aware successful-payment totals, salon-specific payment methods, status amounts, and database franchise/salon IDs on services and membership plans. Detail rankings are complete in exports. Queries aggregate payments, bill lines and memberships separately before combining group results, avoiding join multiplication. Distinct franchise customers are queried directly rather than summed across salons. Service details group under franchise and salon, retaining the selected ranking within each salon. Salon Performance preserves the selected salon sort.

Historical snapshots remain downloadable without fetching newer business data. Missing historical daily/payment ownership details are disclosed in Report Information; regenerate to capture complete details. Performance Note stays blank because the database has no editorial performance-note field or agreed rule. There is no organization model; Overall Business is the platform scope label. Super Admin authorization is enforced at both controller and service boundaries, including download, history and background processing. Franchise-admin reporting remains independently scoped to the authenticated franchise.

Revenue shares use successful-payment revenue as the reference denominator. Services, fees and customer spend remain bill-based metrics and may differ from collected revenue. Current retained populations and membership statuses follow the existing report definitions.

## Verification

- Backend build, reporting lint, 20 reporting tests; Prisma validation without schema changes.
- Frontend date preset tests (9), touched-file lint and production build.
- Isolated browser fixtures: 23 page layouts across 17 viewport widths with expanded/collapsed sidebar, 34 configuration/preview dialog layouts, plus generation, preview, CSV download, regeneration, scope reset, chart intervals, empty data and isolated API failure/retry.
- Read-only checks against the configured database: global and salon-scoped queries; summary revenue equals revenue-series and method totals. The verification does not generate/delete reports or mutate business data.

Verification scripts: `scripts/verify-report-analytics.cjs` in the backend; `.responsive-checks/verify-reports-module.mjs` in the frontend. Browser fixture values are confined to verification and are not used by production reporting.
