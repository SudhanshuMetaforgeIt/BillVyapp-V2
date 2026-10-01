-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(36) NOT NULL,
    `ticketNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('BILLING', 'PAYMENTS', 'ACCOUNT', 'FEATURE_REQUEST', 'SUBSCRIPTION', 'REPORTS') NOT NULL,
    `priority` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdById` VARCHAR(36) NOT NULL,
    `franchiseId` VARCHAR(36) NULL,
    `salonId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_tickets_ticketNumber_key`(`ticketNumber`),
    INDEX `support_tickets_status_idx`(`status`),
    INDEX `support_tickets_priority_idx`(`priority`),
    INDEX `support_tickets_category_idx`(`category`),
    INDEX `support_tickets_createdAt_idx`(`createdAt`),
    INDEX `support_tickets_franchiseId_idx`(`franchiseId`),
    INDEX `support_tickets_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `salons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
