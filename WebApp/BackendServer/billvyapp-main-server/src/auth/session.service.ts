import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityStateService } from './security-state.service';

type SessionParams = {
  sessionId: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityStateService,
  ) {}

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
    await this.security.openSession(params.sessionId);
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
    if (!(await this.security.touchSession(sessionId))) return null;

    return session;
  }

  async isActive(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });

    return (
      !!session &&
      session.userId === userId &&
      session.revokedAt === null &&
      session.expiresAt.getTime() > Date.now() &&
      (await this.security.touchSession(sessionId))
    );
  }

  async rotate(
    oldId: string,
    oldToken: string,
    params: SessionParams,
  ): Promise<void> {
    await this.security.openSession(params.sessionId, oldId);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.userSession.updateMany({
        where: {
          id: oldId,
          userId: params.userId,
          tokenHash: SessionService.digest(oldToken),
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new UnauthorizedException('Invalid refresh token');
      await tx.userSession.create({
        data: {
          id: params.sessionId,
          userId: params.userId,
          tokenHash: SessionService.digest(params.refreshToken),
          expiresAt: params.expiresAt,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent?.slice(0, 512) ?? null,
        },
      });
    });
  }

  async recentlyAuthenticated(id: string): Promise<boolean> {
    return this.security.recentlyAuthenticated(id);
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
