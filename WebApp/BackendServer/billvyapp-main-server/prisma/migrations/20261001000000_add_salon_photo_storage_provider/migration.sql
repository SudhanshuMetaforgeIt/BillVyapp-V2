-- Preserve the storage provider for each existing and future public salon image.
-- Existing rows are historical S3 records, so the default is deliberately S3.
ALTER TABLE `salon_photos`
  ADD COLUMN `storageProvider` VARCHAR(50) NOT NULL DEFAULT 'S3' AFTER `salonId`;
