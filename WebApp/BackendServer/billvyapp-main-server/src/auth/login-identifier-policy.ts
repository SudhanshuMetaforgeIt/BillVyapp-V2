import { ForbiddenException } from '@nestjs/common';

/** Ordinary profile/admin writes cannot substitute for proof of identifier ownership.
 * A future OTP/OAuth verification flow must authorize and commit changes separately.
 */
export function assertUnchangedLoginIdentifiers(
  current: { email: string; phone: string | null },
  proposed: { email?: string; phone?: string | null },
): void {
  if (
    (proposed.email !== undefined &&
      proposed.email !== current.email.trim().toLowerCase()) ||
    (proposed.phone !== undefined && proposed.phone !== current.phone)
  ) {
    throw new ForbiddenException({
      code: 'OWNERSHIP_VERIFICATION_REQUIRED',
      message:
        'Changing login email or phone requires ownership verification. Identifier changes are unavailable until verification is enabled.',
    });
  }
}
