import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import type { OtpStore } from './otp.contracts';

/**
 * Redis-backed OTP storage.
 *
 * Keys:
 *   otp:login:{phone}     hashed OTP, TTL = OTP expiry
 *   otp:attempts:{phone}  verification attempt counter
 *   otp:resend:{phone}    resend cooldown flag
 *
 * Only hashes are stored. The plaintext code never reaches Redis or MySQL.
 */
@Injectable()
export class RedisOtpStore implements OtpStore {
  constructor(private readonly redis: RedisService) {}

  async saveHash(
    phone: string,
    codeHash: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.client.set(
      this.loginKey(phone),
      codeHash,
      'EX',
      ttlSeconds,
    );
  }

  async getHash(phone: string): Promise<string | null> {
    return this.redis.client.get(this.loginKey(phone));
  }

  async deleteHash(phone: string): Promise<void> {
    await this.redis.client.del(this.loginKey(phone));
  }

  async consumeHash(phone: string, expectedHash: string): Promise<boolean> {
    return (
      Number(
        await this.redis.client.eval(
          "if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end; redis.call('DEL', KEYS[1]); return 1",
          1,
          this.loginKey(phone),
          expectedHash,
        ),
      ) === 1
    );
  }

  async getAttempts(phone: string): Promise<number> {
    const raw = await this.redis.client.get(this.attemptsKey(phone));
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async incrementAttempts(phone: string, ttlSeconds: number): Promise<number> {
    const key = this.attemptsKey(phone);
    return Number(
      await this.redis.client.eval(
        "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
        1,
        key,
        ttlSeconds,
      ),
    );
  }

  async resetAttempts(phone: string): Promise<void> {
    await this.redis.client.del(this.attemptsKey(phone));
  }

  async acquireResendSlot(phone: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.client.set(
      this.resendKey(phone),
      '1',
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  private loginKey(phone: string): string {
    return `otp:login:${phone}`;
  }

  private attemptsKey(phone: string): string {
    return `otp:attempts:${phone}`;
  }

  private resendKey(phone: string): string {
    return `otp:resend:${phone}`;
  }
}
