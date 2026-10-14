import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SparklebotService } from './sparklebot.service';

@Module({
  imports: [ConfigModule],
  providers: [SparklebotService],
  exports: [SparklebotService],
})
export class WhatsAppModule {}
