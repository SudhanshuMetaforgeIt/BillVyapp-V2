import { Global, Module } from '@nestjs/common';
import { BusinessTimezoneService } from './business-timezone.service';

@Global()
@Module({
  providers: [BusinessTimezoneService],
  exports: [BusinessTimezoneService],
})
export class DatetimeModule {}
