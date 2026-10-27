import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export const PASSWORD_RESET_TTL = 600;
export const PASSWORD_RESET_QUEUE = 'password-reset-email';
export const RESET_VERIFY_LUA = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] or redis.call('HGET', KEYS[1], 'state') ~= 'CODE' then return 0 end
local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
if attempts > 5 then redis.call('DEL', KEYS[1]); return 0 end
if redis.call('HGET', KEYS[1], 'codeHash') ~= ARGV[2] or redis.call('HGET', KEYS[1], 'userId') == '' then
  if attempts >= 5 then redis.call('DEL', KEYS[1]) end
  return 0
end
redis.call('HSET', KEYS[1], 'state', 'VERIFIED', 'tokenHash', ARGV[3])
redis.call('HDEL', KEYS[1], 'codeHash')
redis.call('EXPIRE', KEYS[1], ARGV[4]); redis.call('EXPIRE', KEYS[2], ARGV[4]); return 1`;
export const RESET_CONSUME_LUA = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] or redis.call('HGET', KEYS[1], 'state') ~= 'VERIFIED' or redis.call('HGET', KEYS[1], 'tokenHash') ~= ARGV[2] then return 0 end
redis.call('DEL', KEYS[1], KEYS[2]); return 1`;

@Injectable()
export class PasswordResetStore {
  constructor(private readonly redis: RedisService) {}
  private key(id: string) {
    return `password-reset:challenge:${id}`;
  }
  private latest(identity: string) {
    return `password-reset:latest:${identity}`;
  }
  async rateLimit(identity: string): Promise<boolean> {
    return (
      Number(
        await this.redis.client.eval(
          `
      if redis.call('EXISTS', KEYS[1]) == 1 or tonumber(redis.call('GET', KEYS[2]) or '0') >= 5 then return 0 end
      redis.call('SET', KEYS[1], '1', 'EX', 60)
      local n = redis.call('INCR', KEYS[2]); if n == 1 then redis.call('EXPIRE', KEYS[2], 3600) end
      return 1`,
          2,
          `password-reset:cooldown:${identity}`,
          `password-reset:hour:${identity}`,
        ),
      ) === 1
    );
  }
  async save(id: string, email: string, identity: string): Promise<void> {
    await this.redis.client.eval(
      `
      redis.call('HSET', KEYS[1], 'email', ARGV[2], 'identity', ARGV[3], 'state', 'PENDING')
      redis.call('EXPIRE', KEYS[1], ARGV[4]); redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[4]); return 1`,
      2,
      this.key(id),
      this.latest(identity),
      id,
      email,
      identity,
      PASSWORD_RESET_TTL,
    );
  }
  read(id: string): Promise<Record<string, string>> {
    return this.redis.client.hgetall(this.key(id));
  }
  async claimMail(id: string, identity: string): Promise<boolean> {
    return (
      Number(
        await this.redis.client.eval(
          `
      if redis.call('GET', KEYS[2]) ~= ARGV[1] or redis.call('HGET', KEYS[1], 'state') ~= 'PENDING' or redis.call('HEXISTS', KEYS[1], 'mailClaimed') == 1 then return 0 end
      redis.call('HSET', KEYS[1], 'mailClaimed', '1'); return 1`,
          2,
          this.key(id),
          this.latest(identity),
          id,
        ),
      ) === 1
    );
  }
  async prepareCode(
    id: string,
    identity: string,
    userId: string,
    version: string,
    codeHash: string,
  ): Promise<boolean> {
    return (
      Number(
        await this.redis.client.eval(
          `
      if redis.call('GET', KEYS[2]) ~= ARGV[1] or redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
      redis.call('HSET', KEYS[1], 'state', 'CODE', 'userId', ARGV[2], 'version', ARGV[3], 'codeHash', ARGV[4], 'attempts', '0'); return 1`,
          2,
          this.key(id),
          this.latest(identity),
          id,
          userId,
          version,
          codeHash,
        ),
      ) === 1
    );
  }
  async verify(
    id: string,
    identity: string,
    codeHash: string,
    tokenHash: string,
  ): Promise<boolean> {
    return (
      Number(
        await this.redis.client.eval(
          RESET_VERIFY_LUA,
          2,
          this.key(id),
          this.latest(identity),
          id,
          codeHash,
          tokenHash,
          PASSWORD_RESET_TTL,
        ),
      ) === 1
    );
  }
  async consume(
    id: string,
    identity: string,
    tokenHash: string,
  ): Promise<boolean> {
    return (
      Number(
        await this.redis.client.eval(
          RESET_CONSUME_LUA,
          2,
          this.key(id),
          this.latest(identity),
          id,
          tokenHash,
        ),
      ) === 1
    );
  }
}
