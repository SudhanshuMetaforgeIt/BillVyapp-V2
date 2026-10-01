-- CreateTable
CREATE TABLE `platform_plans` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `priceMonthly` DECIMAL(12, 2) NULL,
    `billingCycle` ENUM('MONTHLY', 'YEARLY', 'CUSTOM') NOT NULL DEFAULT 'MONTHLY',
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `iconKey` VARCHAR(50) NOT NULL DEFAULT 'basic',
    `features` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_plans_name_key`(`name`),
    INDEX `platform_plans_isActive_idx`(`isActive`),
    INDEX `platform_plans_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
