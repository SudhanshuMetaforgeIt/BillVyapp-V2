-- CreateTable
CREATE TABLE `expense_categories` (
    `id` VARCHAR(36) NOT NULL,
    `businessId` VARCHAR(36) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expense_categories_businessId_name_idx`(`businessId`, `name`),
    INDEX `expense_categories_businessId_parentId_idx`(`businessId`, `parentId`),
    INDEX `expense_categories_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `expense_categories_businessId_id_key`(`businessId`, `id`),
    UNIQUE INDEX `expense_categories_businessId_parentId_name_key`(`businessId`, `parentId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(36) NOT NULL,
    `businessId` VARCHAR(36) NOT NULL,
    `branchId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `expenseNumber` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `expenseDate` DATE NOT NULL,
    `paymentMethod` ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER') NOT NULL,
    `vendorName` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `receiptUrl` VARCHAR(2048) NULL,
    `createdBy` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expenses_expenseNumber_key`(`expenseNumber`),
    INDEX `expenses_businessId_branchId_expenseDate_idx`(`businessId`, `branchId`, `expenseDate`),
    INDEX `expenses_businessId_categoryId_expenseDate_idx`(`businessId`, `categoryId`, `expenseDate`),
    INDEX `expenses_branchId_expenseDate_idx`(`branchId`, `expenseDate`),
    INDEX `expenses_categoryId_idx`(`categoryId`),
    INDEX `expenses_createdBy_idx`(`createdBy`),
    INDEX `expenses_expenseDate_idx`(`expenseDate`),
    INDEX `expenses_businessId_paymentMethod_expenseDate_idx`(`businessId`, `paymentMethod`, `expenseDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `franchises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_businessId_parentId_fkey` FOREIGN KEY (`businessId`, `parentId`) REFERENCES `expense_categories`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `franchises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `salons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_businessId_categoryId_fkey` FOREIGN KEY (`businessId`, `categoryId`) REFERENCES `expense_categories`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
