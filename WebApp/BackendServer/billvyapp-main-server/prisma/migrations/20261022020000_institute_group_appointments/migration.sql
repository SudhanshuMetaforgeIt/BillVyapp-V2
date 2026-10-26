ALTER TABLE `appointments`
 ADD COLUMN `isGroupBooking` BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN `studentGender` ENUM('MALE','FEMALE','OTHER','UNISEX') NULL,
 ADD COLUMN `studentCount` INTEGER NULL,
 ADD COLUMN `contactName` VARCHAR(150) NULL,
 ADD COLUMN `contactPhone` VARCHAR(20) NULL,
 ADD COLUMN `contactRole` VARCHAR(32) NULL,
 ADD COLUMN `instituteRequestKey` VARCHAR(191) NULL,
 ADD COLUMN `instituteRequestHash` VARCHAR(64) NULL;
CREATE UNIQUE INDEX `appointments_institute_request_key` ON `appointments`(`salonId`,`instituteRequestKey`);
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_group_details_check` CHECK (`isGroupBooking` = false OR (`studentGender` IN ('MALE','FEMALE') AND `studentGender` IS NOT NULL AND `studentCount` BETWEEN 1 AND 10000 AND `studentCount` IS NOT NULL AND `contactName` IS NOT NULL AND `contactPhone` IS NOT NULL));
ALTER TABLE `bills` ADD COLUMN `appointmentId` VARCHAR(36) NULL;
CREATE UNIQUE INDEX `bills_appointmentId_key` ON `bills`(`appointmentId`);
ALTER TABLE `bills` ADD CONSTRAINT `bills_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD COLUMN `appointmentId` VARCHAR(36) NULL;
CREATE UNIQUE INDEX `notifications_appointment_recipient_key` ON `notifications`(`appointmentId`,`userId`,`notificationType`);
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
