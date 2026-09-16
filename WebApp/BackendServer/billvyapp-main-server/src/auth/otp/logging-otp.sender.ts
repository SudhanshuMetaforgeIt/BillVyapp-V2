import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpSender } from './otp.contracts';

/**
 * Placeholder sender used until a real SMS/WhatsApp provider is integrated.
 *
 * The plaintext code is logged only when development OTP mode is enabled and
 * NODE_ENV is not production. Production never logs the code.
 */
@Injectable()
export class LoggingOtpSender implements OtpSender {
  private readonly logger = new Logger('OtpSender');

  constructor(private readonly config: ConfigService) {}

  send(phone: string, code: string): Promise<void> {
    const masked = this.mask(phone);

    if (this.canLogCode()) {
      this.logger.log(`DEV OTP for ${masked}: ${code}`);
    } else {
      this.logger.log(
        `OTP dispatch requested for ${masked} - no provider configured, code withheld`,
      );
    }

    return Promise.resolve();
  }

  private canLogCode(): boolean {
    const nodeEnv = this.config.get<string>('nodeEnv') ?? process.env.NODE_ENV;
    const enabled = this.config.get<boolean>('otp.devEnabled') === true;
    return nodeEnv !== 'production' && enabled;
  }

  private mask(phone: string): string {
    return phone.length === 10
      ? `${phone.slice(0, 2)}******${phone.slice(-2)}`
      : '**********';
  }
}
