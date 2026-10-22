-- Preserve catalog identities when both retired and Other classifications share a name.
UPDATE `services` AS retired JOIN `services` AS existing ON existing.salonId = retired.salonId AND existing.name = retired.name AND existing.gender = 'OTHER' SET retired.name = CONCAT(LEFT(retired.name, 144), ' (Other ', retired.id, ')') WHERE retired.gender = 'PREFER_NOT_TO_SAY';
UPDATE `service_categories` AS retired JOIN `service_categories` AS existing ON existing.salonId = retired.salonId AND existing.name = retired.name AND existing.gender = 'OTHER' SET retired.name = CONCAT(LEFT(retired.name, 144), ' (Other ', retired.id, ')') WHERE retired.gender = 'PREFER_NOT_TO_SAY';
UPDATE `customers` SET `gender` = 'OTHER' WHERE `gender` = 'PREFER_NOT_TO_SAY';
ALTER TABLE `customers` MODIFY `gender` ENUM('MALE','FEMALE','OTHER','UNISEX') NOT NULL;
UPDATE `services` SET `gender` = 'OTHER' WHERE `gender` = 'PREFER_NOT_TO_SAY';
ALTER TABLE `services` MODIFY `gender` ENUM('MALE','FEMALE','OTHER','UNISEX') NOT NULL;
UPDATE `service_categories` SET `gender` = 'OTHER' WHERE `gender` = 'PREFER_NOT_TO_SAY';
ALTER TABLE `service_categories` MODIFY `gender` ENUM('MALE','FEMALE','OTHER','UNISEX') NOT NULL;
UPDATE `bills` SET `serviceGender` = 'OTHER' WHERE `serviceGender` = 'PREFER_NOT_TO_SAY';
ALTER TABLE `bills` MODIFY `serviceGender` ENUM('MALE','FEMALE','OTHER','UNISEX') NOT NULL;
