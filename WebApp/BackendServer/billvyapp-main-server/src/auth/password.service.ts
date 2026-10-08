import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_ID,
} from '../settings/settings.constants';

/**
 * Argon2id password hashing. Plaintext passwords are never persisted, logged,
 * or returned. Verification is constant-time via argon2.verify.
 */
@Injectable()
export class PasswordService {
  constructor(private readonly prisma: PrismaService) {}

  /** Apply the current database policy only to new passwords, never tokens or login checks. */
  async assertPolicy(plain: string): Promise<void> {
    const policy =
      (await this.prisma.platformSettings.findUnique({
        where: { id: PLATFORM_SETTINGS_ID },
        select: {
          passwordMinLength: true,
          passwordRequireUppercase: true,
          passwordRequireLowercase: true,
          passwordRequireNumbers: true,
          passwordRequireSpecial: true,
        },
      })) ?? DEFAULT_PLATFORM_SETTINGS;
    const failures: string[] = [];
    if (plain.length < policy.passwordMinLength)
      failures.push(`at least ${policy.passwordMinLength} characters`);
    if (plain.length > 128) failures.push('at most 128 characters');
    if (policy.passwordRequireUppercase && !/[A-Z]/.test(plain))
      failures.push('an uppercase letter');
    if (policy.passwordRequireLowercase && !/[a-z]/.test(plain))
      failures.push('a lowercase letter');
    if (policy.passwordRequireNumbers && !/[0-9]/.test(plain))
      failures.push('a number');
    if (policy.passwordRequireSpecial && !/[^A-Za-z0-9\s]/.test(plain))
      failures.push('a special character');
    if (failures.length)
      throw new BadRequestException(
        `Password must contain ${failures.join(', ')}.`,
      );
  }
  // `raw?: false` pins the overload that returns an encoded string rather than
  // a Buffer, which is what the passwordHash / tokenHash columns store.
  private readonly options: argon2.HashOptions & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // A malformed stored hash must read as "wrong password", not as a 500.
      return false;
    }
  }
}
