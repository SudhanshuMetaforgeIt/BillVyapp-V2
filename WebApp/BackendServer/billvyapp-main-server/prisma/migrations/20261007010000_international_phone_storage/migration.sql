-- E.164 requires at most 15 digits plus the leading +. Keep the existing
-- unique phone index so OTP/login and duplicate checks remain indexed.
ALTER TABLE `users` MODIFY `phone` VARCHAR(16) NULL;

-- The backfill script captures original values before changing them.
CREATE TABLE `phone_normalization_backup` (
  `entityTable` VARCHAR(32) NOT NULL,
  `entityId` VARCHAR(36) NOT NULL,
  `fieldName` VARCHAR(32) NOT NULL,
  `oldPhone` VARCHAR(64) NOT NULL,
  `newPhone` VARCHAR(16) NOT NULL,
  `migratedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`entityTable`, `entityId`, `fieldName`)
);
