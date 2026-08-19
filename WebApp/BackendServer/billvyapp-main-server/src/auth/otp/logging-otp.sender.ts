import { Injectable, Logger } from '@nestjs/common';
import { OtpSender } from './otp.contracts';

/**
 * Placeholder sender used until a real provider is integrated.
 *
 * It deliberately does NOT log the code: OTP values must never reach logs.
 * That means end-to-end OTP verification cannot be exercised until a real
 * OtpSender is bound in AuthModule.
 */
@Injectable()
export class LoggingOtpSender implements OtpSender {
  private readonly logger = new Logger('OtpSender');

  send(phone: string): Promise<void> {
    this.logger.log(
      `OTP dispatch requested for ${this.mask(phone)} - no provider configured, code withheld`,
    );
    return Promise.resolve();
  }

  private mask(phone: string): string {
    return phone.length === 10
      ? `${phone.slice(0, 2)}******${phone.slice(-2)}`
      : '**********';
  }
}
