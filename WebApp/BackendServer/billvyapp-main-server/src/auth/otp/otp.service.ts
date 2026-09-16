import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
   * Claims the per-phone resend slot. Must be called for every send-otp
   * request, including unknown numbers, so HTTP 429 cannot enumerate accounts.
   */
  async consumeResendSlot(phone: string): Promise<void> {
    const ttl = this.config.get<number>('otp.resendSeconds', 60);
    const acquired = await this.store.acquireResendSlot(phone, ttl);
    if (!acquired) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Generates a cryptographically secure OTP, stores only its hash, and
   * dispatches via the bound sender. Overwrites any previous code (single
   * active OTP per phone). Returns the plaintext code so the caller can
   * optionally include it as `devOtp` in non-production.
   */
  async issue(phone: string): Promise<string> {
    const length = this.config.get<number>('otp.length', 6);
    const ttl = this.config.get<number>('otp.expirySeconds', 300);
    const code = this.generateCode(length);

    await this.store.saveHash(phone, await this.passwords.hash(code), ttl);
    await this.store.resetAttempts(phone);
    await this.sender.send(phone, code);

    return code;
  }

  /**
   * Single-use verification. The hash is deleted on success so a code cannot
   * be replayed. Exhausting the attempt budget also deletes the hash.
   *
   * Returns false for missing / expired / wrong codes.
   * Throws HttpException 429 when the attempt budget is spent.
   */
  async verify(phone: string, code: string): Promise<boolean> {
    const maxAttempts = this.config.get<number>('otp.maxAttempts', 5);
    const ttl = this.config.get<number>('otp.expirySeconds', 300);

    const attempts = await this.store.getAttempts(phone);
    if (attempts >= maxAttempts) {
      await this.store.deleteHash(phone);
      throw new HttpException(
        'Too many verification attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const storedHash = await this.store.getHash(phone);
    if (!storedHash) {
      return false;
    }

    const matches = await this.passwords.verify(storedHash, code);

    if (!matches) {
      const next = await this.store.incrementAttempts(phone, ttl);
      if (next >= maxAttempts) {
        await this.store.deleteHash(phone);
        throw new HttpException(
          'Too many verification attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return false;
    }

    await this.store.deleteHash(phone);
    await this.store.resetAttempts(phone);
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
