import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id password hashing. Plaintext passwords are never persisted, logged,
 * or returned. Verification is constant-time via argon2.verify.
 */
@Injectable()
export class PasswordService {
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
