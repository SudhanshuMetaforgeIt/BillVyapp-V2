import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { PasswordService } from '../password.service';
import { OTP_SENDER, OTP_STORE } from './otp.contracts';
import type { OtpSender, OtpStore } from './otp.contracts';

@Injectable()
export class OtpService {
  constructor(
    @Inject(OTP_STORE) private readonly store: OtpStore,
    @Inject(OTP_SENDER) private readonly sender: OtpSender,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates, stores (hashed) and dispatches a code.
   *
   * Callers must invoke this only for phone numbers that exist, but must return
   * an identical response either way so the endpoint cannot be used to
   * enumerate registered accounts.
   */
  async issue(phone: string): Promise<void> {
    const length = this.config.get<number>('otp.length', 6);
    const ttl = this.config.get<number>('otp.expirySeconds', 300);

    const code = this.generateCode(length);

    await this.store.set(phone, {
      codeHash: await this.passwords.hash(code),
      expiresAt: Date.now() + ttl * 1000,
      attempts: 0,
    });

    await this.sender.send(phone, code);
  }

  /**
   * Single-use verification. The record is consumed on success and on
   * exhausting the attempt budget, so a code can never be replayed.
   */
  async verify(phone: string, code: string): Promise<boolean> {
    const record = await this.store.get(phone);
    if (!record) return false;

    const maxAttempts = this.config.get<number>('otp.maxAttempts', 5);

    if (record.attempts >= maxAttempts) {
      await this.store.delete(phone);
      return false;
    }

    const matches = await this.passwords.verify(record.codeHash, code);

    if (!matches) {
      await this.store.set(phone, { ...record, attempts: record.attempts + 1 });
      return false;
    }

    await this.store.delete(phone);
    return true;
  }

  private generateCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += randomInt(0, 10).toString();
    }
    return code;
  }
}
