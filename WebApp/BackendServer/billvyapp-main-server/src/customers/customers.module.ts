import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerAddressesController } from './customer-addresses.controller';
import { CustomerAddressesService } from './customer-addresses.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController, CustomerAddressesController],
  providers: [CustomersService, CustomerAddressesService],
  exports: [CustomersService, CustomerAddressesService],
})
export class CustomersModule {}
