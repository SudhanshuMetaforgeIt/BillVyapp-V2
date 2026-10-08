# Expense implementation report

Implemented database-backed expense APIs following the direct request to add APIs. This overrides the attachment's final schema-only sentence. No frontend pages were added. Expenses are recorded immediately; there is no approval state or workflow.

## API contract

All routes use the existing `/api` prefix, JWT authentication, role guards and active-subscription guard. Swagger documents the endpoints at `/api/docs`.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/expenses` | Paginated scoped list |
| GET | `/api/expenses/summary` | Count, exact amount total, groups by category/payment method |
| GET | `/api/expenses/:id` | Scoped detail with business, branch, category and creator names |
| POST | `/api/expenses` | Immediately record an expense |
| PATCH | `/api/expenses/:id` | Correct mutable expense fields |
| GET | `/api/expense-categories` | Paginated business categories, parent hierarchy |
| GET | `/api/expense-categories/:id` | Scoped category detail |
| POST | `/api/expense-categories` | Admin create category |
| PATCH | `/api/expense-categories/:id` | Admin edit/reparent category |
| PATCH | `/api/expense-categories/:id/status` | Admin set `{ "isActive": false }` or true |

Manager access is limited to the assigned branch; Admin access is limited to their business; Super Admin has read-only platform scope with franchise and salon filters. Super Admin cannot create/edit expenses or create/edit/activate/deactivate categories. Managers can read the categories of their branch's business. Staff and Customers cannot access these endpoints. Category availability is not expense approval. There are no delete, upload, approval or rejection endpoints.

Example manager create request (replace category ID with one returned by the categories API):

```json
{
  "categoryId": "<Electricity category UUID>",
  "amount": 25000,
  "expenseDate": "2026-10-08",
  "paymentMethod": "BANK_TRANSFER",
  "vendorName": "TSSPDCL",
  "description": "October electricity bill",
  "receiptUrl": "receipts/october-electricity.pdf"
}
```

Manager business/branch default from verified identity. Admin must supply an authorized `branchId`; optional `businessId` must match that branch. The server assigns `createdBy` and `expenseNumber`. Unknown fields, including client-supplied creator, number and status, are rejected. Business, branch, creator and number cannot be changed through PATCH. Nullable text/receipt fields may be cleared with null.

Expense filters: `businessId`, `branchId`, `categoryId`, `createdBy`, `paymentMethod`, `dateFrom`, `dateTo`, `search`, `page`, `limit`. Dates use YYYY-MM-DD, inclusive bounds. Search matches expense number, vendor and description. Scope cannot be widened by filters. Summary uses all matching rows regardless of pagination. List responses are `{data,meta}`. Amounts are returned as exact two-decimal strings and expense dates as YYYY-MM-DD.

Category filters: `businessId`, `parentId`, `rootsOnly=true`, `isActive`, `search`, `page`, `limit`. Use parentId references to assemble the hierarchy; root categories have null parentId. Inactive categories and inactive ancestors cannot be selected for new expenses. Existing expenses remain readable.

## 1. Existing models inspected

The existing Prisma schema, migration history, authentication, scope, subscription, payment, audit, pagination and seed conventions were inspected. Business is `Franchise` (`franchises`); branch is `Salon` (`salons`), with `franchiseId`; creator is `User` (`users`), with role and business/branch scope. JWT strategy reloads user identity from the database.

## 2. New models created

Only `ExpenseCategory` → `expense_categories` and `Expense` → `expenses` were added. No extra vendor, attachment, approval, status or audit tables.

## 3. Exact fields added

Columns intentionally use camelCase, matching the existing database convention rather than renaming existing fields to snake_case.

`ExpenseCategory`: `id` UUID VARCHAR(36) primary key; `businessId` required VARCHAR(36); `parentId` nullable VARCHAR(36); `name` required VARCHAR(191); `description` nullable TEXT; `isActive` boolean default true; `createdAt` DATETIME(3) default now; `updatedAt` DATETIME(3) Prisma-managed timestamp.

`Expense`: `id` UUID VARCHAR(36) primary key; `businessId`, `branchId`, `categoryId`, `createdBy` required VARCHAR(36); `expenseNumber` required unique VARCHAR(50); `amount` required DECIMAL(12,2); `expenseDate` required DATE; `paymentMethod` required ExpensePaymentMethod; `vendorName` nullable VARCHAR(191); `description` nullable TEXT; `receiptUrl` nullable VARCHAR(2048); `createdAt` DATETIME(3) default now; `updatedAt` DATETIME(3) Prisma-managed timestamp.

Only reverse Prisma relation fields were added to existing models: `Franchise.expenseCategories`, `Franchise.expenses`, `Salon.expenses`, `User.createdExpenses`. They do not add SQL columns to existing tables.

## 4. Relationships created

Category business → Franchise; category parent → category using composite `(businessId,parentId)` → `(businessId,id)`. Expense business → Franchise; branch → Salon; creator → User; category using composite `(businessId,categoryId)` → category `(businessId,id)`. Composite category constraints prevent cross-business categories/parents at database level. Branch/business pairing and authenticated creator are enforced in the service because adding a composite key to the existing Salon table would alter an unrelated existing table.

All foreign keys use RESTRICT on delete and CASCADE on update, following existing financial relation conventions. Category cycles, duplicate sibling names and unauthorized IDs are rejected in the service. Root-name uniqueness is also checked under a business row lock because MySQL permits multiple NULL values in a composite unique key.

## 5. Indexes created

Categories: primary key id; unique `(businessId,id)` and `(businessId,parentId,name)`; indexes `(businessId,name)`, `(businessId,parentId)`, `(businessId,isActive)`.

Expenses: primary key id; unique expenseNumber; indexes `(businessId,branchId,expenseDate)`, `(businessId,categoryId,expenseDate)`, `(branchId,expenseDate)`, `categoryId`, `createdBy`, `expenseDate`, `(businessId,paymentMethod,expenseDate)`. Composite prefixes support scoped queries without redundant single business/branch indexes. Payment-method reporting is business-scoped.

## 6. Enums reused/created

Existing billing `PaymentMethod` does not include CHEQUE and includes WALLET. Created `ExpensePaymentMethod` with exactly CASH, UPI, CARD, BANK_TRANSFER, CHEQUE, OTHER, leaving existing billing untouched.

## 7. Seed data added

Existing seed files and their commands remain unchanged. Dedicated `prisma/seed-expense-categories.cjs` adds the requested 8 parents and 37 children per existing business: Utilities, Staff, Operations, Marketing, Rent & Property, Administration, Transportation, Other. It only inserts missing categories; existing names/availability are preserved. New businesses can run it with `--business-id <UUID>`.

```powershell
npm run build
node --env-file=.env prisma/seed-expense-categories.cjs
```

Local database result: 5 businesses, 225 categories inserted. Second execution: 0 inserted. No sample expenses were seeded.

## 8. Migration name

`20261008093000_expenses`, additive SQL in `prisma/migrations/20261008093000_expenses/migration.sql`.

## 9. Migration result

Applied successfully using `prisma migrate deploy` against the configured local MySQL `billvyapp_v2`. Only the two new tables and their keys/indexes were created. No existing table was reset, dropped, renamed or altered. Subsequent migrate status: all 23 migrations applied, no pending migrations.

## 10. Prisma validation result

`prisma format` and `prisma validate` passed with Prisma 7.9.1.

## 11. Prisma Client generation result

`prisma generate` passed and generated the client at the existing `src/generated/prisma` location.

## 12. Tests/build result

Backend build passed. Full Jest suite: 66 suites, 830 tests passed before the read-only update; 41 expense tests passed after it, including 41 expense tests covering tenant access, immutable fields, valid dates/money/receipts, category cycles and duplicate names, ancestor availability, numbering bounds and summary scope. Expense module ESLint passed.

`node --env-file=.env prisma/verify-expenses.cjs` verifies 17 HTTP requests through the actual expense controllers, global validation and real RolesGuard against MySQL. It supplies an existing manager identity directly for this isolated harness; login/JWT/subscription middleware are unchanged and not exercised by this harness. Verified real creates, details, edits, categories, summaries and role rejection. All test expense/category/audit writes were rolled back; existing records were not changed. Two separate transaction sessions proved the numbering mutex serializes overlapping creators. No test expense remains in the database.

## 13. Existing schema issue discovered

Before implementing expenses, migrate status reported all 22 prior migrations applied, but comparison of the live database against the original schema revealed pre-existing index/foreign-key drift. This includes appointments' old staffId FK/index versus composite indexes; missing newer indexes across audit_logs, bills, bill_items, customers, franchise_subscriptions, inventory, memberships, notifications, payments, platform_reports, products, purchases, services, stock_movements, support_tickets and users; and a missing customers.userId FK. No unrelated drift was repaired or included in this migration. Applied migration history does not imply the entire live schema matches Prisma.

## 14. Convention and implementation decisions

UUID VARCHAR(36) IDs, camelCase columns, snake_case plural table mappings, timestamps, money precision, Nest modules/DTOs, global authentication and scoped permissions follow the project. Receipts store only PDF/JPG/JPEG/PNG HTTP(S) URLs or storage paths; actual uploads are separate.

Numbers are globally unique per expense-date year: EXP-YYYY-000001 through EXP-YYYY-999999. The backend obtains a locking read on the first existing Franchise row as a shared numbering mutex, then allocates the next number and inserts the expense/audit inside the same READ COMMITTED transaction. A unique index is the final guard. The mutex does not change business data or require another table/column, but globally serializes expense creation; a dedicated sequence would require relaxing the two-table requirement. Failed/rolled-back inserts consume no number. Corrections retain the original number even if expenseDate changes.

Existing audit_logs record expense/category mutations atomically with the mutation; there is no separate expense audit table. Expenses are never approved/rejected and have no lifecycle status. Category deactivation preserves financial history.

