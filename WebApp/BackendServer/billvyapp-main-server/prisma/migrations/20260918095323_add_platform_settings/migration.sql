-- CreateTable
CREATE TABLE `platform_settings` (
    `id` VARCHAR(36) NOT NULL,
    `platformName` VARCHAR(100) NOT NULL,
    `tagline` VARCHAR(255) NULL,
    `adminEmail` VARCHAR(191) NOT NULL,
    `contactNumber` VARCHAR(20) NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    `dateFormat` VARCHAR(32) NOT NULL DEFAULT 'DD MMM YYYY',
    `logoMediaFileId` VARCHAR(36) NULL,
    `faviconMediaFileId` VARCHAR(36) NULL,
    `primaryColor` VARCHAR(32) NULL,
    `secondaryColor` VARCHAR(32) NULL,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `passwordMinLength` INTEGER NOT NULL DEFAULT 8,
    `passwordRequireUppercase` BOOLEAN NOT NULL DEFAULT true,
    `passwordRequireLowercase` BOOLEAN NOT NULL DEFAULT true,
    `passwordRequireNumbers` BOOLEAN NOT NULL DEFAULT true,
    `passwordRequireSpecial` BOOLEAN NOT NULL DEFAULT false,
    `sessionTimeoutMinutes` INTEGER NOT NULL DEFAULT 30,
    `maxLoginAttempts` INTEGER NOT NULL DEFAULT 5,
    `lockoutDurationMinutes` INTEGER NOT NULL DEFAULT 15,
    `logRetentionDays` INTEGER NOT NULL DEFAULT 90,
    `smtpHost` VARCHAR(191) NULL,
    `smtpPort` INTEGER NULL,
    `smtpUser` VARCHAR(191) NULL,
    `smtpPassword` VARCHAR(512) NULL,
    `smtpFromEmail` VARCHAR(191) NULL,
    `smtpFromName` VARCHAR(100) NULL,
    `smtpSecure` BOOLEAN NOT NULL DEFAULT true,
    `notificationDefaults` JSON NULL,
    `systemConfig` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_integrations` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(100) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'INACTIVE',
    `config` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `platform_integrations_status_isActive_idx`(`status`, `isActive`),
    UNIQUE INDEX `platform_integrations_provider_key`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
