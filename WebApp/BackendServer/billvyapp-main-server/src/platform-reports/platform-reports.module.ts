import { ReportAnalyticsService } from './report-analytics.service';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PlatformReportsController } from './platform-reports.controller';
import { PlatformReportsService } from './platform-reports.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { ReportsProcessor } from './reports.processor';
import { REPORT_QUEUE } from './report.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: REPORT_QUEUE,
    }),
  ],
  controllers: [PlatformReportsController, AdminReportsController],
  providers: [
    PlatformReportsService,
    ReportAnalyticsService,
    AdminReportsService,
    ReportsProcessor,
  ],
  exports: [PlatformReportsService, AdminReportsService],
})
export class PlatformReportsModule {}

