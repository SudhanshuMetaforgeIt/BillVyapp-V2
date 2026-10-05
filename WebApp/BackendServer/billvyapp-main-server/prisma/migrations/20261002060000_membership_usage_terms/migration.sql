-- Existing plans retain their previous allowance behavior until a visit limit is configured.
ALTER TABLE `membership_plans` ADD COLUMN `couponUsageLimit` INTEGER NULL, ADD COLUMN `termsAndConditions` TEXT NULL;
