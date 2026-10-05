-- AlterTable
ALTER TABLE `membership_plans` ADD COLUMN `benefits` TEXT NULL,
    ADD COLUMN `couponPrefix` VARCHAR(32) NULL,
    ADD COLUMN `enrollmentThreshold` DECIMAL(12, 2) NULL;

-- AlterTable
ALTER TABLE `memberships` ADD COLUMN `couponCode` VARCHAR(80) NULL,
    ADD COLUMN `planSnapshot` JSON NULL,
    ADD COLUMN `qualifyingBillId` VARCHAR(36) NULL;

-- CreateTable
CREATE TABLE `_MembershipPlanToService` (
    `A` VARCHAR(36) NOT NULL,
    `B` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `_MembershipPlanToService_AB_unique`(`A`, `B`),
    INDEX `_MembershipPlanToService_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `memberships_couponCode_key` ON `memberships`(`couponCode`);

-- CreateIndex
CREATE UNIQUE INDEX `memberships_qualifyingBillId_key` ON `memberships`(`qualifyingBillId`);

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_qualifyingBillId_fkey` FOREIGN KEY (`qualifyingBillId`) REFERENCES `bills`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MembershipPlanToService` ADD CONSTRAINT `_MembershipPlanToService_A_fkey` FOREIGN KEY (`A`) REFERENCES `membership_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MembershipPlanToService` ADD CONSTRAINT `_MembershipPlanToService_B_fkey` FOREIGN KEY (`B`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing enrollments without exposing internal identifiers.
-- Historical terms before this migration cannot be reconstructed; preserve the current plan terms.
UPDATE `memberships` m JOIN `membership_plans` p ON p.id = m.membershipPlanId
SET m.couponCode = CONCAT('MEMBER-', HEX(RANDOM_BYTES(16))),
    m.planSnapshot = JSON_OBJECT('name', p.name, 'description', p.description,
      'price', CAST(p.price AS CHAR), 'durationDays', p.durationDays,
      'benefits', p.benefits, 'enrollmentThreshold', NULL, 'eligibleServices', JSON_ARRAY())
WHERE m.couponCode IS NULL;
ALTER TABLE `memberships` MODIFY `couponCode` VARCHAR(80) NOT NULL;
