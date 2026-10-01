import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AUDIT_LOG_PURGE_QUEUE } from './audit.constants';
import { AuditLogPurgeProcessor } from './audit-log-purge.processor';
import { AuditLogPurgeScheduler } from './audit-log-purge.scheduler';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: AUDIT_LOG_PURGE_QUEUE })],
  controllers: [AuditLogsController],
  providers: [
    AuditService,
    AuditLogsService,
    AuditLogPurgeProcessor,
    AuditLogPurgeScheduler,
  ],
  exports: [AuditService],
})
export class AuditModule {}
