import { BillsModule } from '../bills/bills.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { InstituteAppointmentsController } from './institute-appointments.controller';
import { InstituteAppointmentsService } from './institute-appointments.service';
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [BillsModule, WhatsAppModule],
  controllers: [AppointmentsController, InstituteAppointmentsController],
  providers: [AppointmentsService, InstituteAppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
