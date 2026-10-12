import { Module } from '@nestjs/common';
import { LoyaltyProgramController } from './loyalty-program.controller';
import { LoyaltyProgramService } from './loyalty-program.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  controllers: [LoyaltyProgramController, LoyaltyController],
  providers: [LoyaltyService, LoyaltyProgramService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
