import { Module } from '@nestjs/common';
import { PlatformReportsController } from './platform-reports.controller';
import { PlatformReportsService } from './platform-reports.service';

@Module({
  controllers: [PlatformReportsController],
  providers: [PlatformReportsService],
  exports: [PlatformReportsService],
})
export class PlatformReportsModule {}
