import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { MaintenanceService } from './maintenance.service';
import { DatabaseBackupService } from './database-backup.service';

@Module({
  imports: [MediaModule],
  controllers: [SettingsController],
  providers: [SettingsService, MaintenanceService, DatabaseBackupService],
  exports: [SettingsService, MaintenanceService],
})
export class SettingsModule {}
