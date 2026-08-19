/**
 * Provider-agnostic OTP contracts.
 *
 * No SMS vendor is referenced anywhere in this file or its implementations.
 * Wiring a real provider later means supplying a different OtpSender binding
 * in AuthModule; nothing else changes.
 */

export const OTP_STORE = Symbol('OTP_STORE');
export const OTP_SENDER = Symbol('OTP_SENDER');

export interface OtpRecord {
  /** Hash of the code. The plaintext code is never retained. */
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

export interface OtpStore {
  get(phone: string): Promise<OtpRecord | null>;
  set(phone: string, record: OtpRecord): Promise<void>;
  delete(phone: string): Promise<void>;
}

export interface OtpSender {
  /** Delivers the code out-of-band. Implementations must not log the code. */
  send(phone: string, code: string): Promise<void>;
}
