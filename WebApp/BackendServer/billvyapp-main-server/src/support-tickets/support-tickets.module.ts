import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}
