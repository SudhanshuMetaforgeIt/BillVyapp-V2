import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import type { OtpRecord, OtpStore } from './otp.contracts';

/**
 * Redis-backed pending OTP storage.
 *
 * Survives restarts and is shared across instances, which the previous
 * in-memory store could not do. Only the HASH of the code is stored; the
 * plaintext code is never persisted.
 *
 * Every write carries a TTL derived from the record's own expiry, so an
 * abandoned code disappears on its own even if verification is never attempted.
 */
@Injectable()
export class RedisOtpStore implements OtpStore {
  private static readonly PREFIX = 'otp:';

  constructor(private readonly redis: RedisService) {}

  async get(phone: string): Promise<OtpRecord | null> {
    const raw = await this.redis.client.get(this.key(phone));
    if (!raw) return null;

    let record: OtpRecord;
    try {
      record = JSON.parse(raw) as OtpRecord;
    } catch {
      // Unreadable entry is treated as absent, and cleaned up.
      await this.delete(phone);
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      await this.delete(phone);
      return null;
    }

    return record;
  }

  async set(phone: string, record: OtpRecord): Promise<void> {
    // TTL is recomputed from the record rather than reset to the full window,
    // so incrementing the attempt counter cannot extend the code's lifetime.
    const ttlSeconds = Math.max(
      1,
      Math.ceil((record.expiresAt - Date.now()) / 1000),
    );

    await this.redis.client.set(
      this.key(phone),
      JSON.stringify(record),
      'EX',
      ttlSeconds,
    );
  }

  async delete(phone: string): Promise<void> {
    await this.redis.client.del(this.key(phone));
  }

  private key(phone: string): string {
    return `${RedisOtpStore.PREFIX}${phone}`;
  }
}
