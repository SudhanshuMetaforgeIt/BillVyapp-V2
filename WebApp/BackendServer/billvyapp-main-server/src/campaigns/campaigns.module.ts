import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ScopeModule } from '../common/scope/scope.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [PrismaModule, ScopeModule, AuditModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
