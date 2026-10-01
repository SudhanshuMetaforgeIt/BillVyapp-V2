-- CreateTable
CREATE TABLE `franchise_subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `franchiseId` VARCHAR(36) NOT NULL,
    `platformPlanId` VARCHAR(36) NOT NULL,
    `billingCycle` ENUM('MONTHLY', 'YEARLY', 'CUSTOM') NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `startsAt` DATE NOT NULL,
    `endsAt` DATE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `franchise_subscriptions_franchiseId_status_idx`(`franchiseId`, `status`),
    INDEX `franchise_subscriptions_platformPlanId_idx`(`platformPlanId`),
    INDEX `franchise_subscriptions_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `franchise_subscriptions` ADD CONSTRAINT `franchise_subscriptions_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `franchise_subscriptions` ADD CONSTRAINT `franchise_subscriptions_platformPlanId_fkey` FOREIGN KEY (`platformPlanId`) REFERENCES `platform_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
