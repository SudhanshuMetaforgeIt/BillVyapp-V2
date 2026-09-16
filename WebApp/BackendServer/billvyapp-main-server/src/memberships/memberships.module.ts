import { Module } from '@nestjs/common';
import { MembershipPlansController } from './membership-plans.controller';
import { MembershipPlansService } from './membership-plans.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  controllers: [MembershipPlansController, MembershipsController],
  providers: [MembershipPlansService, MembershipsService],
  exports: [MembershipPlansService, MembershipsService],
})
export class MembershipsModule {}
