ALTER TABLE `membership_redemptions` ADD COLUMN `membershipPlanId` VARCHAR(36) NULL;
UPDATE `membership_redemptions` r JOIN `memberships` m ON m.id = r.membershipId SET r.membershipPlanId = m.membershipPlanId;
ALTER TABLE `membership_redemptions` MODIFY `membershipPlanId` VARCHAR(36) NOT NULL;
