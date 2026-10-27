import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SparklebotService } from './sparklebot.service';
import { InstituteAppointmentWhatsAppService } from './institute-appointment-whatsapp.service';
import { WhatsAppOutboxService } from './whatsapp-outbox.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SparklebotService,
    InstituteAppointmentWhatsAppService,
    WhatsAppOutboxService,
  ],
  exports: [
    SparklebotService,
    InstituteAppointmentWhatsAppService,
    WhatsAppOutboxService,
  ],
})
export class WhatsAppModule {}
