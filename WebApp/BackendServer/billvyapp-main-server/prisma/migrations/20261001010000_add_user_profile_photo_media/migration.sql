ALTER TABLE `users` ADD COLUMN `profilePhotoMediaFileId` VARCHAR(36) NULL;
CREATE UNIQUE INDEX `users_profilePhotoMediaFileId_key` ON `users` (`profilePhotoMediaFileId`);
ALTER TABLE `users` ADD CONSTRAINT `users_profilePhotoMediaFileId_fkey`
  FOREIGN KEY (`profilePhotoMediaFileId`) REFERENCES `media_files` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
