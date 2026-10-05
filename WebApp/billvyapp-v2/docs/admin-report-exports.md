# Franchise Admin reports

Download Report opens a format menu. Overview is the supported report type;
Excel (.xlsx) is the supported export format. No printing or dashboard image
capture is involved. Other report types are hidden until complete backend exports
exist.

The existing platform-reports backend module now includes Admin-only analytics,
generation, history, and download handlers at `/admin-reports`. Both dashboard
and workbook use the same `AdminReportsService.snapshot` and
`aggregateAdminBills` functions. The authenticated user's franchise controls every
query. A branch must belong to that franchise. Caller-supplied franchise IDs are
rejected by DTO validation. Existing billing, membership and role rules are unchanged.

Dates are inclusive business calendar dates. Empty dates default to this month
through today in the franchise business timezone; the effective range is displayed
and captured before exporting. Canonical and legacy bill dates use the existing
date serialization contract. Daily, Monday-based weekly and monthly aggregation
is shared with Excel.

Revenue means collected amount on completed bills dated in the selected range.
Branch/customer revenue and graph totals reconcile to that number. Total Bills
includes all statuses; bill detail identifies draft/cancelled records, which do
not contribute revenue. Average Bill Value uses completed bill totals.
Customer counts describe customers with bill history in the selected franchise/
branch. Services and Admin/Manager/Staff accounts are current scoped populations.
Payment analytics use payments attached to completed bills dated in the selected
range, including split payments; they do not use a separate payment-date range.

The workbook includes Executive Summary, Revenue Analysis, Bills - Transactions,
Branch Performance, Customer Summary, Payment Methods and Services. Dates and
amounts are typed cells with number formats. It includes formatted tables,
filters, frozen headers and native editable charts referencing worksheet cells.
Zero-activity periods still produce a valid workbook with an explicit message.

Data is paged on the backend in batches of 1,000, within a repeatable-read
transaction. React receives aggregate data only. Ranges over ten years or 50,000
bills fail explicitly with instructions to narrow scope; no sample is exported.

The existing PlatformReport model stores a franchise report snapshot with
Generating, Ready or Failed state. No schema migration is required. History
shows the latest 20 franchise report records, and downloads use the saved data,
dates and branch name. Changing current filters cannot change a saved report.
Binary XLSX downloads set the correct MIME type and attachment filename.

Verification: report unit tests, frontend API tests, responsive browser checks
with isolated fixtures, ExcelJS/OpenPyXL readers, OOXML chart/reference checks,
rendered worksheet review, TypeScript, touched-file lint and production builds.
`scripts/verify-admin-report-analytics.cjs` performs read-only database queries,
checks revenue reconciliation and rejects a foreign branch when one exists.
