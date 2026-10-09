-- Review historical currency assignments before applying to production.
-- New requests require keys. NULL preserves legacy rows without inventing request identities.
ALTER TABLE `bills`
  ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `requestHash` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `bills_salonId_idempotencyKey_key` (`salonId`, `idempotencyKey`);
UPDATE `bills` b JOIN `salons` s ON s.id = b.salonId JOIN `franchises` f ON f.id = s.franchiseId
SET b.currency = CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(f.preferences, '$.currency')) = 'USD' THEN 'USD' ELSE 'INR' END;
ALTER TABLE `payments`
  ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `requestHash` VARCHAR(64) NULL,
  ADD COLUMN `provider` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN `providerTransactionId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `payments_billId_idempotencyKey_key` (`billId`, `idempotencyKey`),
  ADD UNIQUE INDEX `payments_provider_providerTransactionId_key` (`provider`, `providerTransactionId`);
UPDATE `payments` p JOIN `bills` b ON b.id = p.billId SET p.currency = b.currency;
-- Historical references intentionally remain NULL in providerTransactionId: reconcile them first.
ALTER TABLE `memberships`
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `requestHash` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `memberships_customerId_idempotencyKey_key` (`customerId`, `idempotencyKey`);
ALTER TABLE `franchise_subscriptions`
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `requestHash` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `franchise_subscriptions_franchiseId_idempotencyKey_key` (`franchiseId`, `idempotencyKey`);
ALTER TABLE `loyalty_transactions`
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `requestHash` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `loyalty_transactions_customerId_idempotencyKey_key` (`customerId`, `idempotencyKey`);
