ALTER TABLE `customers` ADD COLUMN `whatsappNumber` VARCHAR(20) NULL;
ALTER TABLE `bills` ADD COLUMN `enrollmentPlanId` VARCHAR(36) NULL, ADD COLUMN `enrollmentDetails` JSON NULL, ADD COLUMN `membershipFee` DECIMAL(12,2) NOT NULL DEFAULT 0, ADD COLUMN `enrollmentPlanName` VARCHAR(191) NULL;
ALTER TABLE `bills` ADD CONSTRAINT `bills_enrollmentPlanId_fkey` FOREIGN KEY (`enrollmentPlanId`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
