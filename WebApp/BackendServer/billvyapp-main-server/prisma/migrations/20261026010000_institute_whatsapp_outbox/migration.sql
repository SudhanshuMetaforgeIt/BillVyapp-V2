CREATE TABLE `whatsapp_outbox` (
 `id` VARCHAR(36) NOT NULL,
 `eventKey` VARCHAR(191) NOT NULL,
 `notificationId` VARCHAR(36) NOT NULL,
 `recipient` VARCHAR(20) NOT NULL,
 `templateName` VARCHAR(100) NOT NULL,
 `language` VARCHAR(16) NOT NULL,
 `bodyFields` JSON NOT NULL,
 `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 `providerReference` VARCHAR(191) NULL,
 `attempts` INTEGER NOT NULL DEFAULT 0,
 `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `claimedAt` DATETIME(3) NULL,
 `sentAt` DATETIME(3) NULL,
 `errorMessage` VARCHAR(255) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `updatedAt` DATETIME(3) NOT NULL,
 UNIQUE INDEX `whatsapp_outbox_eventKey_key` (`eventKey`),
 UNIQUE INDEX `whatsapp_outbox_notificationId_key` (`notificationId`),
 INDEX `whatsapp_outbox_status_availableAt_idx` (`status`, `availableAt`),
 PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `whatsapp_outbox` ADD CONSTRAINT `whatsapp_outbox_notificationId_fkey`
 FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
