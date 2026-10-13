# Microsoft Graph email delivery

Notifications and customer bills use Microsoft Graph app-only authentication. Credentials are server environment values; none are returned to the browser. SMTP passwords are not used by this provider.

## Local configuration and activation

- `MAIL_PROVIDER=graph`
- `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`
- `GRAPH_FROM_EMAIL` (falls back to `MAIL_FROM_EMAIL`)
- `MAIL_DELIVERY_ENABLED=false` keeps sending and automatic source capture paused. Sending was initially paused because customer addresses are test data. The user has now authorized activation; local sending is enabled with a fresh activation timestamp.
- Before enabling delivery, replace test recipient addresses with real intended recipients and set `MAIL_START_AT` to the new activation timestamp in ISO UTC format. Then set `MAIL_DELIVERY_ENABLED=true` and restart the backend. Do not enable sending against the current random email addresses.
- Existing pending email-outbox rows are not erased by changing the cutoff. Inspect these before activation if sending was previously enabled. Test emails requested through platform settings are durable queued messages too.

The Azure application needs Microsoft Graph `Mail.Send` application permission with administrator consent and access to the configured sender mailbox. Restrict its mailbox access in Exchange as appropriate. The authentication-only diagnostic `node scripts/check-graph-mail.cjs` checks the token and permission claim without sending any message. It does not prove mailbox access or delivery.

The supplied local credentials authenticated successfully and the token included `Mail.Send`. No live delivery test was performed. Rotate the secrets shared in chat before production deployment.

## Notification delivery

Every new notification after the activation cutoff is staged into `email_outbox`, using a unique source-notification key. EMAIL records use their authorized explicit recipient. IN_APP records resolve the recipient's active user email from the database; linked customer notifications resolve the customer's active account email. Unlinked phone-only notifications cannot invent an email destination and receive a recorded failure.

Low-stock records are created within their existing inventory transaction. The email worker sees only committed records; no network email call occurs within a business transaction. In-app delivery/read state remains unchanged, preserving bell counts. Scheduled notifications retain their scheduled send time. Cancellation prevents pending messages from being sent.

The BullMQ dispatcher stages mail instead of simulating successful delivery. A ten-second bounded database scan recovers messages even if Redis was unavailable during notification creation. Queue outages leave notifications pending, never falsely sent.

## Customer bills

The worker captures completed, cancelled and refunded bill changes after the activation cutoff. Drafts are not emailed. Receipts use the customer email and shop association stored on the bill. Bill line prices, quantities, membership discounts/coupon, item and bill discounts, enrollment fee, taxes, rounding, currency, loyalty redemption, payments and outstanding balance all come from the database. Dynamic text is HTML escaped. A completed unpaid bill is explicitly labeled UNPAID; confirmed payment changes produce an updated receipt. Emails contain a complete HTML receipt, not a PDF attachment.

Capture locks the bill, stores an immutable message snapshot and advances the internal `emailQueuedAt` marker in one transaction. Advancing this marker does not change the bill's business `updatedAt`. A hash of the snapshot prevents identical repeated changes from creating duplicate receipts. Multiple changes before the next scan may be consolidated into the latest receipt.

## Delivery states and recovery

Workers atomically claim PENDING mail as SENDING. Only one worker can claim an event. Graph `202 Accepted` records SENT; this is provider acceptance, not confirmed inbox delivery or customer reading. Acceptance and the source notification update are committed together.

Explicit 429/401 rejections and transient authentication failures receive bounded backoff, at most five attempts. Permanent rejection records FAILED with a sanitized error. Network timeout, Graph server error or interrupted SENDING state becomes UNKNOWN and is not resent automatically, because Graph sendMail has no idempotency guarantee. Check the sender's Sent Items / Exchange message trace before manually reconciling UNKNOWN mail. Never reset UNKNOWN/SENDING blindly; retrying could create duplicates. The notification retry endpoint permits retry of explicit FAILED deliveries and refuses accepted/ambiguous attempts.

Email delivery failures do not roll back billing or inventory changes. Pending work survives restarts. Outbox HTML contains customer information and must remain covered by database access controls, encrypted backups and retention policies; it is not exposed through a public download route.

## Verification

- Backend Jest tests cover Graph authentication, escaping, currencies, receipt accounting, acceptance vs delivery, rate limits, pause behavior and duplicate claims.
- `scripts/verify-mail-outbox.cjs` only permits the disposable `127.0.0.1:33091/billvy_security_test_mail` database. It blocks fetch and uses a fake sender. Checks cover real MySQL bill capture concurrency, repeated scans, payment updates, notification duplicates/privacy, cancellation and paused delivery. It never loads the application's `.env`.
- No email was sent to application/customer addresses during implementation.

Microsoft references: [sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0), [client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).
