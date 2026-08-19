import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import {
  AuthenticatedUser,
  JwtRefreshPayload,
} from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto, AuthTokensDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const GENERIC_OTP_MESSAGE =
  'If the number is registered, a verification code has been sent.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- password

  async login(dto: LoginDto, ctx: RequestContext): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        isActive: true,
        franchiseId: true,
        salonId: true,
        role: { select: { code: true, isActive: true } },
      },
    });

    if (!user) {
      // Burn comparable CPU so a missing account is not detectable by timing.
      await this.passwords.hash(dto.password);
      await this.audit.record({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.passwords.verify(user.passwordHash, dto.password);

    if (!valid || !user.isActive || !user.role.isActive) {
      await this.audit.record({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueSession(
      {
        userId: user.id,
        email: user.email,
        role: user.role.code as RoleCode,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
        sessionId: null,
      },
      ctx,
    );

    await this.audit.record({
      userId: user.id,
      salonId: user.salonId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.code,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
      },
    };
  }

  // --------------------------------------------------------------------- otp

  /**
   * Always resolves with the same message whether or not the number exists.
   * Any branch that returned early or threw would turn this endpoint into an
   * account enumeration oracle.
   */
  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { id: true, isActive: true },
    });

    if (user && user.isActive) {
      try {
        await this.otp.issue(dto.phone);
      } catch (error) {
        this.logger.error(
          'OTP issue failed',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return { message: GENERIC_OTP_MESSAGE };
  }

  /**
   * Authenticates an EXISTING user found by users.phone. It never creates a
   * user and never creates a customer row: customers already exist because a
   * salon recorded them at billing time.
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    ctx: RequestContext,
  ): Promise<AuthResponseDto> {
    const valid = await this.otp.verify(dto.phone, dto.code);

    if (!valid) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        franchiseId: true,
        salonId: true,
        role: { select: { code: true, isActive: true } },
      },
    });

    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const tokens = await this.issueSession(
      {
        userId: user.id,
        email: user.email,
        role: user.role.code as RoleCode,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
        sessionId: null,
      },
      ctx,
    );

    await this.audit.record({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.code,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
      },
    };
  }

  // ----------------------------------------------------------------- refresh

  /** Rotating refresh: the presented session is revoked and replaced. */
  async refresh(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<AuthTokensDto> {
    let payload: JwtRefreshPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessions.findValid(payload.sid, refreshToken);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        franchiseId: true,
        salonId: true,
        role: { select: { code: true, isActive: true } },
      },
    });

    if (!user || !user.isActive || !user.role.isActive) {
      await this.sessions.revoke(session.id);
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.sessions.revoke(session.id);

    const tokens = await this.issueSession(
      {
        userId: user.id,
        email: user.email,
        role: user.role.code as RoleCode,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
        sessionId: null,
      },
      ctx,
    );

    await this.audit.record({
      userId: user.id,
      action: 'TOKEN_REFRESHED',
      entityType: 'UserSession',
      entityId: session.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return tokens;
  }

  // ------------------------------------------------------------------ logout

  async logout(
    user: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ message: string }> {
    if (user.sessionId) {
      await this.sessions.revoke(user.sessionId);
    }

    await this.audit.record({
      userId: user.userId,
      action: 'LOGOUT',
      entityType: 'UserSession',
      entityId: user.sessionId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { message: 'Logged out' };
  }

  // ----------------------------------------------------------------- helpers

  private async issueSession(
    identity: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<AuthTokensDto> {
    const sessionId = randomUUID();

    const accessToken = await this.jwt.signAsync(
      {
        sub: identity.userId,
        email: identity.email,
        role: identity.role,
        franchiseId: identity.franchiseId,
        salonId: identity.salonId,
        sid: sessionId,
      },
      // Asserted because jsonwebtoken types expiresIn as a template-literal
      // union; the value is validated as a non-empty string at boot.
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.getOrThrow<string>('jwt.accessExpiresIn'),
      } as JwtSignOptions,
    );

    const refreshExpiresIn = this.config.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: identity.userId, sid: sessionId },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      } as JwtSignOptions,
    );

    await this.sessions.create({
      sessionId,
      userId: identity.userId,
      refreshToken,
      expiresAt: new Date(Date.now() + this.toMilliseconds(refreshExpiresIn)),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  /** Converts a jsonwebtoken-style duration ("15m", "7d") to milliseconds. */
  private toMilliseconds(duration: string): number {
    const match = /^(\d+)\s*([smhd])?$/.exec(duration.trim());

    if (!match) {
      throw new Error(`Unsupported token duration: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2] ?? 's';
    const factors: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return value * factors[unit];
  }
}
