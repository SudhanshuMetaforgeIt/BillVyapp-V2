-- AlterTable
ALTER TABLE `users` MODIFY `phone` VARCHAR(10) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`);

