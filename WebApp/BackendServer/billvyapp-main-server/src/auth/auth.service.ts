import {
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
import {
  GENERIC_AUTH_FAILURE,
  GENERIC_OTP_FAILURE,
  GENERIC_OTP_MESSAGE,
  JWT_TYPE_ACCESS,
  JWT_TYPE_REFRESH,
  PASSWORD_LOGIN_ROLES,
} from './auth.constants';
import {
  AuthResponseDto,
  AuthTokensDto,
  AuthUserDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const AUTH_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  profilePhoto: true,
  isActive: true,
  franchiseId: true,
  salonId: true,
  role: { select: { code: true, isActive: true } },
} as const;

const AUTH_USER_WITH_HASH_SELECT = {
  ...AUTH_USER_SELECT,
  passwordHash: true,
} as const;

type AuthUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  franchiseId: string | null;
  salonId: string | null;
  role: { code: string; isActive: boolean };
};

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
      select: AUTH_USER_WITH_HASH_SELECT,
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
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    const allowedRole = PASSWORD_LOGIN_ROLES.includes(
      user.role.code as RoleCode,
    );

    if (!valid || !user.isActive || !user.role.isActive || !allowedRole) {
      await this.audit.record({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    const tokens = await this.issueSession(user, ctx);

    await this.audit.record({
      userId: user.id,
      salonId: user.salonId,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ...tokens, user: this.toPublicUser(user) };
  }

  // --------------------------------------------------------------------- otp

  /**
   * Always resolves with the same success message whether or not the number
   * exists. Resend throttling runs first so HTTP 429 cannot enumerate accounts.
   */
  async sendOtp(
    dto: SendOtpDto,
    ctx: RequestContext,
  ): Promise<{ message: string; devOtp?: string }> {
    await this.otp.consumeResendSlot(dto.phone);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: {
        id: true,
        isActive: true,
        role: { select: { code: true, isActive: true } },
      },
    });

    let devOtp: string | undefined;

    if (
      user &&
      user.isActive &&
      user.role.isActive &&
      user.role.code === (RoleCode.CUSTOMER as string)
    ) {
      const code = await this.otp.issue(dto.phone);
      if (this.canExposeDevOtp()) {
        devOtp = code;
      }
    }

    await this.audit.record({
      userId: user?.id ?? null,
      action: 'OTP_REQUESTED',
      entityType: 'User',
      entityId: user?.id ?? null,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      message: GENERIC_OTP_MESSAGE,
      ...(devOtp ? { devOtp } : {}),
    };
  }

  /**
   * Authenticates an existing CUSTOMER found by users.phone. Never creates a
   * user and never creates a customer row.
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    ctx: RequestContext,
  ): Promise<AuthResponseDto> {
    let valid = false;

    try {
      valid = await this.otp.verify(dto.phone, dto.otp);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 429) {
        await this.audit.record({
          action: 'OTP_FAILED',
          entityType: 'User',
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      }
      throw error;
    }

    if (!valid) {
      await this.audit.record({
        action: 'OTP_FAILED',
        entityType: 'User',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException(GENERIC_OTP_FAILURE);
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: AUTH_USER_SELECT,
    });

    if (
      !user ||
      !user.isActive ||
      !user.role.isActive ||
      user.role.code !== (RoleCode.CUSTOMER as string)
    ) {
      await this.audit.record({
        userId: user?.id ?? null,
        action: 'OTP_FAILED',
        entityType: 'User',
        entityId: user?.id ?? null,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException(GENERIC_OTP_FAILURE);
    }

    const tokens = await this.issueSession(user, ctx);

    await this.audit.record({
      userId: user.id,
      action: 'OTP_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ...tokens, user: this.toPublicUser(user) };
  }

  // ----------------------------------------------------------------- refresh

  /**
   * Refresh-token rotation: the presented session is revoked and replaced
   * with a new session (new refresh token hash in user_sessions).
   */
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

    if (payload.type !== JWT_TYPE_REFRESH || !payload.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessions.findValid(
      payload.sessionId,
      refreshToken,
    );

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: AUTH_USER_SELECT,
    });

    if (!user || !user.isActive || !user.role.isActive) {
      await this.sessions.revoke(session.id);
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.sessions.revoke(session.id);

    const tokens = await this.issueSession(user, ctx, {
      updateLastLogin: false,
    });

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
    dto: LogoutDto | undefined,
    ctx: RequestContext,
  ): Promise<{ message: string }> {
    const sessionIds = new Set<string>();

    if (user.sessionId) {
      sessionIds.add(user.sessionId);
    }

    if (dto?.refreshToken) {
      const extra = await this.sessionIdFromRefresh(
        dto.refreshToken,
        user.userId,
      );
      if (extra) {
        sessionIds.add(extra);
      }
    }

    for (const sessionId of sessionIds) {
      await this.sessions.revoke(sessionId);
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

  // ---------------------------------------------------------------------- me

  async me(identity: AuthenticatedUser): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: identity.userId },
      select: AUTH_USER_SELECT,
    });

    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.toPublicUser(user);
  }

  // ----------------------------------------------------------------- helpers

  private async issueSession(
    user: AuthUserRow,
    ctx: RequestContext,
    options: { updateLastLogin?: boolean } = {},
  ): Promise<AuthTokensDto> {
    const sessionId = randomUUID();
    const role = user.role.code as RoleCode;

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        role,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
        type: JWT_TYPE_ACCESS,
        sessionId,
      },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.getOrThrow<string>('jwt.accessExpiresIn'),
      } as JwtSignOptions,
    );

    const refreshExpiresIn = this.config.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        type: JWT_TYPE_REFRESH,
        sessionId,
      },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      } as JwtSignOptions,
    );

    await this.sessions.create({
      sessionId,
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + this.toMilliseconds(refreshExpiresIn)),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    if (options.updateLastLogin !== false) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  private async sessionIdFromRefresh(
    refreshToken: string,
    userId: string,
  ): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        { secret: this.config.getOrThrow<string>('jwt.refreshSecret') },
      );
      if (
        payload.type === JWT_TYPE_REFRESH &&
        payload.sub === userId &&
        payload.sessionId
      ) {
        return payload.sessionId;
      }
    } catch {
      this.logger.debug('Logout presented an unusable refresh token');
    }
    return null;
  }

  private toPublicUser(user: AuthUserRow): AuthUserDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role.code,
      franchiseId: user.franchiseId,
      salonId: user.salonId,
      profilePhoto: user.profilePhoto,
      isActive: user.isActive,
    };
  }

  /**
   * `devOtp` is allowed only when NODE_ENV is not production AND
   * DEV_OTP_ENABLED is true. Production never returns the code, even if the
   * flag is accidentally left on.
   */
  private canExposeDevOtp(): boolean {
    const nodeEnv =
      this.config.get<string>('nodeEnv') ?? process.env.NODE_ENV ?? '';
    const enabled = this.config.get<boolean>('otp.devEnabled') === true;
    return nodeEnv !== 'production' && enabled;
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
