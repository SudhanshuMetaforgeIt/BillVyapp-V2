Phone country is an independent franchise preference (`IN` or `US`). Set it in Admin → Settings → General Settings. All salons inherit it. Missing preferences retain the existing India default.

Phone writes accept 10 local digits or an international number starting with `+`. Local digits receive the franchise prefix; existing international numbers keep their prefix. This covers users, customers, salons, franchises, vendors, membership WhatsApp contacts, and manually addressed SMS/WhatsApp notifications. Public registration and OTP login provide a country selector because no franchise session exists yet.

Deploy the schema migration before serving the new application. Build the backend, then run `node scripts/migrate-phone-numbers.cjs` to check existing data. Resolve any reported invalid or duplicate rows before running `node scripts/migrate-phone-numbers.cjs --apply`. The apply operation backs up original values in `phone_normalization_backup` and converts the checked rows in a transaction. Backups contain personal data and should retain the database's existing access controls.

Run `node scripts/verify-phone-index.cjs` to verify the exact lookup query plan. The existing `users_phone_key` unique index is preserved. Normalization occurs before writes and OTP lookup; reads do not add a franchise lookup. Partial substring searches retain their existing query behavior. This is a query-plan check, not a latency benchmark.

Local database verification on 2026-10-07: 46 values converted and backed up; a repeat dry run reported zero changes and zero invalid rows. The exact lookup used `users_phone_key`, `const` access, and one estimated row. Production deployment and migration must be run against the production environment separately.
