import { Injectable } from '@nestjs/common';
import { SparklebotService } from '../../whatsapp/sparklebot.service';
import type { OtpSender } from './otp.contracts';

@Injectable()
export class SparklebotOtpSender implements OtpSender {
  constructor(private readonly sparklebot: SparklebotService) {}
  isAvailable(): boolean {
    return this.sparklebot.enabled;
  }
  send(phone: string, code: string): Promise<void> {
    return this.sparklebot.sendOtp(phone, code);
  }
}
