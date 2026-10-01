import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { FranchiseSubscriptionsController } from './franchise-subscriptions.controller';
import { FranchiseSubscriptionsService } from './franchise-subscriptions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FranchiseSubscriptionsController],
  providers: [FranchiseSubscriptionsService],
  exports: [FranchiseSubscriptionsService],
})
export class FranchiseSubscriptionsModule {}
