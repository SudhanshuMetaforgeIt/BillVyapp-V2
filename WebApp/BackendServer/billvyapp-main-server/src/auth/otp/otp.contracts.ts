/**
 * Provider-agnostic OTP contracts.
 *
 * OTP values live in Redis only. Nothing here writes to MySQL.
 * Wiring a real SMS provider later means supplying a different OtpSender
 * binding in AuthModule; nothing else changes.
 */

export const OTP_STORE = Symbol('OTP_STORE');
export const OTP_SENDER = Symbol('OTP_SENDER');

export interface OtpStore {
  /** Overwrites any previous OTP for this phone (invalidates the old code). */
  saveHash(phone: string, codeHash: string, ttlSeconds: number): Promise<void>;
  getHash(phone: string): Promise<string | null>;
  deleteHash(phone: string): Promise<void>;

  getAttempts(phone: string): Promise<number>;
  incrementAttempts(phone: string, ttlSeconds: number): Promise<number>;
  resetAttempts(phone: string): Promise<void>;

  /**
   * Atomically claims a resend slot. Returns false if a recent request is
   * still within the cooldown window.
   */
  acquireResendSlot(phone: string, ttlSeconds: number): Promise<boolean>;
}

export interface OtpSender {
  /**
   * Delivers the code out-of-band.
   * Implementations must not log the code unless development OTP mode is on
   * AND the process is not production.
   */
  send(phone: string, code: string): Promise<void>;
}
