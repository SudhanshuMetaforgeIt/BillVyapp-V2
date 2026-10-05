-- Preserve the membership coupon attached to each bill; no redemption lifecycle or discount rule.
ALTER TABLE `bills` ADD COLUMN `appliedMembershipId` VARCHAR(36) NULL;
CREATE INDEX `bills_appliedMembershipId_idx` ON `bills`(`appliedMembershipId`);
ALTER TABLE `bills` ADD CONSTRAINT `bills_appliedMembershipId_fkey`
FOREIGN KEY (`appliedMembershipId`) REFERENCES `memberships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
