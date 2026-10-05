import { ReportAnalyticsService } from './report-analytics.service';
import { Module } from '@nestjs/common';
import { PlatformReportsController } from './platform-reports.controller';
import { PlatformReportsService } from './platform-reports.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';

@Module({
  controllers: [PlatformReportsController, AdminReportsController],
  providers: [
    PlatformReportsService,
    ReportAnalyticsService,
    AdminReportsService,
  ],
  exports: [PlatformReportsService],
})
export class PlatformReportsModule {}
