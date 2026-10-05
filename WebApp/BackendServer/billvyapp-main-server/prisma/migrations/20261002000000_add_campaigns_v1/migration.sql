-- Campaigns V1: salon-scoped campaign management and reusable MediaFile linkage.
CREATE TABLE `campaigns` (
  `id` VARCHAR(36) NOT NULL,
  `salonId` VARCHAR(36) NOT NULL,
  `createdById` VARCHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('SALON','SERVICE','OFFER','EVENT') NOT NULL,
  `targetAudience` ENUM('ALL_CUSTOMERS','NEW_CUSTOMERS','EXISTING_CUSTOMERS','SALON_CUSTOMERS') NOT NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `status` ENUM('DRAFT','SCHEDULED','ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `offerDescription` TEXT NULL,
  `promotionalMediaFileId` VARCHAR(36) NULL,
  `message` TEXT NULL,
  `deliveryChannels` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `campaigns_promotionalMediaFileId_key`(`promotionalMediaFileId`),
  INDEX `campaigns_salonId_status_idx`(`salonId`, `status`),
  INDEX `campaigns_status_startDate_endDate_idx`(`status`, `startDate`, `endDate`),
  INDEX `campaigns_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `salons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_promotionalMediaFileId_fkey` FOREIGN KEY (`promotionalMediaFileId`) REFERENCES `media_files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
