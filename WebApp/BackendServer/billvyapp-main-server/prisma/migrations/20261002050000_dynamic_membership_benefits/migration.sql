-- No free-text rule is inferred. Existing plans require explicit benefit configuration.
ALTER TABLE `membership_plans`
 ADD COLUMN `benefitType` ENUM('NONE','FREE_SERVICES','PERCENTAGE_DISCOUNT') NOT NULL DEFAULT 'NONE',
 ADD COLUMN `discountPercentage` DECIMAL(5,2) NULL,
 ADD COLUMN `freeServiceLimit` INTEGER NULL;
ALTER TABLE `bill_items`
 ADD COLUMN `linePosition` INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN `membershipDiscount` DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN `membershipUnits` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `membership_redemptions`
 ADD COLUMN `benefitType` ENUM('NONE','FREE_SERVICES','PERCENTAGE_DISCOUNT') NOT NULL DEFAULT 'NONE',
 ADD COLUMN `originalAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN `discountAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN `finalAmount` DECIMAL(12,2) NOT NULL DEFAULT 0;
