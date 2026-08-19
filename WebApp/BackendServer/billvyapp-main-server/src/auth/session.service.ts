import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Owns the `user_sessions` table.
 *
 * Raw refresh tokens are never stored. Only a SHA-256 digest is persisted.
 * SHA-256 (not Argon2) is deliberate: the token must be found by its hash on
 * every refresh, which requires a deterministic digest. That is safe here
 * because refresh tokens are high-entropy signed JWTs, not user-chosen secrets.
 */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  static digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(params: {
    sessionId: string;
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.prisma.userSession.create({
      data: {
        id: params.sessionId,
        userId: params.userId,
        tokenHash: SessionService.digest(params.refreshToken),
        expiresAt: params.expiresAt,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent?.slice(0, 512) ?? null,
      },
    });
  }

  /** Returns the session only if it matches the token, is unrevoked and unexpired. */
  async findValid(sessionId: string, refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    if (session.tokenHash !== SessionService.digest(refreshToken)) return null;

    return session;
  }

  async isActive(sessionId: string): Promise<boolean> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { revokedAt: true, expiresAt: true },
    });

    return (
      !!session &&
      session.revokedAt === null &&
      session.expiresAt.getTime() > Date.now()
    );
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
