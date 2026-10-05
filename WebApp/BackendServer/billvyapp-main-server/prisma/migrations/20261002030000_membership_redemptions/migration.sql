ALTER TABLE `bill_items` ADD COLUMN `membershipBenefit` BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE `membership_redemptions` (
  `id` VARCHAR(36) NOT NULL,
  `membershipId` VARCHAR(36) NOT NULL,
  `billItemId` VARCHAR(36) NOT NULL,
  `couponCode` VARCHAR(80) NOT NULL,
  `billId` VARCHAR(36) NOT NULL,
  `salonId` VARCHAR(36) NOT NULL,
  `serviceId` VARCHAR(36) NOT NULL,
  `serviceName` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `redeemedBy` VARCHAR(36) NOT NULL,
  `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `membership_redemptions_billItemId_key` (`billItemId`),
  INDEX `membership_redemptions_membershipId_redeemedAt_idx` (`membershipId`, `redeemedAt`),
  INDEX `membership_redemptions_billId_idx` (`billId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `membership_redemptions` ADD CONSTRAINT `membership_redemptions_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `memberships` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `membership_redemptions` ADD CONSTRAINT `membership_redemptions_billItemId_fkey` FOREIGN KEY (`billItemId`) REFERENCES `bill_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
