ALTER TABLE `bills` ADD COLUMN `emailQueuedAt` DATETIME(3) NULL;
CREATE TABLE `email_outbox` (
  `id` VARCHAR(36) NOT NULL,
  `eventKey` VARCHAR(191) NOT NULL,
  `notificationId` VARCHAR(36) NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `html` LONGTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `claimedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `errorMessage` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `email_outbox_eventKey_key` (`eventKey`),
  UNIQUE INDEX `email_outbox_notificationId_key` (`notificationId`),
  INDEX `email_outbox_status_availableAt_idx` (`status`, `availableAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `email_outbox_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `notifications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
