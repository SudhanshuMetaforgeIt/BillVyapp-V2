-- CreateTable
CREATE TABLE `platform_reports` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('FINANCIAL', 'BUSINESS', 'USER', 'TRANSACTION', 'SUBSCRIPTION', 'ACTIVITY') NOT NULL,
    `format` ENUM('PDF', 'EXCEL') NOT NULL DEFAULT 'EXCEL',
    `dateFrom` DATE NOT NULL,
    `dateTo` DATE NOT NULL,
    `franchiseId` VARCHAR(36) NULL,
    `generatedById` VARCHAR(36) NOT NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `platform_reports_type_idx`(`type`),
    INDEX `platform_reports_createdAt_idx`(`createdAt`),
    INDEX `platform_reports_franchiseId_idx`(`franchiseId`),
    INDEX `platform_reports_generatedById_idx`(`generatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platform_reports` ADD CONSTRAINT `platform_reports_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_reports` ADD CONSTRAINT `platform_reports_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
