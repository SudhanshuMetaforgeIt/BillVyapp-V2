import { normalizePhone } from '../common/phone';
import {
  ForbiddenException,
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
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import { resolveBusinessTimezone } from '../common/datetime/datetime';
import { franchiseRegion } from '../common/regional';
import { RoleCode } from '../common/enums/role.enum';
import {
  AuthenticatedUser,
  JwtRefreshPayload,
} from '../common/interfaces/authenticated-user.interface';
import { FranchiseSubscriptionsService } from '../franchise-subscriptions/franchise-subscriptions.service';
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
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SecurityStateService } from './security-state.service';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Internal token pair — refresh is moved to an HttpOnly cookie by the controller. */
export type IssuedAuthTokens = AuthTokensDto & { refreshToken: string };
export type IssuedAuthSession = AuthResponseDto & { refreshToken: string };

const AUTH_USER_SELECT = {
  franchise: { select: { preferences: true } },
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

/** Richer payload for GET /auth/me (profile screens). */
const AUTH_ME_SELECT = {
  ...AUTH_USER_SELECT,
  createdAt: true,
  lastLoginAt: true,
  salon: { select: { name: true } },
  franchise: { select: { preferences: true } },
} as const;

const AUTH_USER_WITH_HASH_SELECT = {
  ...AUTH_USER_SELECT,
  passwordHash: true,
} as const;

type AuthUserRow = {
  franchise?: { preferences: unknown } | null;
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

type AuthMeRow = AuthUserRow & {
  createdAt: Date;
  lastLoginAt: Date | null;
  salon: { name: string } | null;
  franchise: { preferences: unknown } | null;
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
    private readonly subscriptions: FranchiseSubscriptionsService,
    private readonly businessTimezone: BusinessTimezoneService,
    private readonly security: SecurityStateService,
  ) {}

  // ---------------------------------------------------------------- password

  async login(dto: LoginDto, ctx: RequestContext): Promise<IssuedAuthSession> {
    await this.security.assertLoginAllowed(dto.email);
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

    await this.security.successfulLogin(dto.email);
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

    return { ...tokens, user: await this.toPublicUser(user) };
  }

  // --------------------------------------------------------------- register

  /**
   * Public registration remains unavailable until ownership verification is integrated.
   * No account lookups, writes or session issuance occur before verification.
   */
  register(
    _dto: RegisterCustomerDto,
    _ctx: RequestContext,
  ): Promise<IssuedAuthSession> {
    // DTO values are intentionally unused until ownership verification is available.
    void _dto;
    void _ctx;
    return Promise.reject(
      new ForbiddenException({
        code: 'OWNERSHIP_VERIFICATION_REQUIRED',
        message:
          'Self-registration requires verified ownership. Please contact your salon until verification is available.',
      }),
    );
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
    const phone = normalizePhone(dto.phone);
    await this.otp.consumeResendSlot(phone);

    const user = await this.prisma.user.findUnique({
      where: { phone },
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
      const code = await this.otp.issue(phone);
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
  ): Promise<IssuedAuthSession> {
    const phone = normalizePhone(dto.phone);
    let valid = false;

    try {
      valid = await this.otp.verify(phone, dto.otp);
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
      where: { phone },
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

    return { ...tokens, user: await this.toPublicUser(user) };
  }

  // ----------------------------------------------------------------- refresh

  /**
   * Refresh-token rotation: the presented session is revoked and replaced
   * with a new session (new refresh token hash in user_sessions).
   */
  async refresh(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<IssuedAuthSession> {
    let payload: JwtRefreshPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        algorithms: ['HS256'],
        issuer: 'billvy-api',
        audience: 'billvy-refresh',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      payload.type !== JWT_TYPE_REFRESH ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.sessionId !== 'string' ||
      !payload.sessionId ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now() / 1000
    ) {
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
      select: AUTH_ME_SELECT,
    });

    if (!user || !user.isActive || !user.role.isActive) {
      await this.sessions.revoke(session.id);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Build the response before rotating. If identity enrichment fails, the
    // existing refresh cookie must remain usable for a later retry.
    const publicUser = await this.toPublicMeUser(user);
    const tokens = await this.issueSession(user, ctx, {
      updateLastLogin: false,
      rotation: { sessionId: session.id, refreshToken },
    });

    await this.audit.record({
      userId: user.id,
      action: 'TOKEN_REFRESHED',
      entityType: 'UserSession',
      entityId: session.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ...tokens, user: publicUser };
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
      select: AUTH_ME_SELECT,
    });

    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.toPublicMeUser(user);
  }

  // ----------------------------------------------------------------- helpers

  private async issueSession(
    user: AuthUserRow,
    ctx: RequestContext,
    options: {
      updateLastLogin?: boolean;
      rotation?: { sessionId: string; refreshToken: string };
    } = {},
  ): Promise<IssuedAuthTokens> {
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
        algorithm: 'HS256',
        issuer: 'billvy-api',
        audience: 'billvy-access',
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
        algorithm: 'HS256',
        issuer: 'billvy-api',
        audience: 'billvy-refresh',
        expiresIn: refreshExpiresIn,
      } as JwtSignOptions,
    );

    const sessionParams = {
      sessionId,
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + this.toMilliseconds(refreshExpiresIn)),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };
    if (options.rotation) {
      await this.sessions.rotate(
        options.rotation.sessionId,
        options.rotation.refreshToken,
        sessionParams,
      );
    } else {
      await this.sessions.create(sessionParams);
    }

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
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
          algorithms: ['HS256'],
          issuer: 'billvy-api',
          audience: 'billvy-refresh',
        },
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

  private async toPublicUser(user: AuthUserRow): Promise<AuthUserDto> {
    const role = user.role.code as RoleCode;
    let subscriptionActive = true;
    let subscriptionPlanName: string | null = null;
    let subscriptionEndsAt: string | null = null;

    if (
      (role === RoleCode.ADMIN ||
        role === RoleCode.MANAGER ||
        role === RoleCode.STAFF) &&
      user.franchiseId
    ) {
      const sub = await this.subscriptions.findActiveForFranchise(
        user.franchiseId,
      );
      subscriptionActive = Boolean(sub?.isCurrentlyActive);
      subscriptionPlanName = sub?.planName ?? null;
      subscriptionEndsAt = sub?.endsAt ?? null;

      if (!subscriptionActive) {
        const latest = await this.subscriptions.findLatestForFranchise(
          user.franchiseId,
        );
        subscriptionPlanName = latest?.planName ?? null;
        subscriptionEndsAt = latest?.endsAt ?? null;
      }
    } else if (
      role === RoleCode.ADMIN ||
      role === RoleCode.MANAGER ||
      role === RoleCode.STAFF
    ) {
      subscriptionActive = false;
    }

    return {
      ...franchiseRegion(user.franchise?.preferences),
      phoneCountry: user.franchise
        ? franchiseRegion(user.franchise.preferences).phoneCountry
        : user.phone?.startsWith('+1')
          ? 'US'
          : 'IN',
      timezone: resolveBusinessTimezone({
        franchiseTimezone: franchiseRegion(user.franchise?.preferences)
          .timezone,
        platformTimezone: await this.businessTimezone.getPlatformTimezone(),
      }),
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
      subscriptionActive,
      subscriptionPlanName,
      subscriptionEndsAt,
    };
  }

  private async toPublicMeUser(user: AuthMeRow): Promise<AuthUserDto> {
    const prefs =
      user.franchise?.preferences &&
      typeof user.franchise.preferences === 'object' &&
      !Array.isArray(user.franchise.preferences)
        ? (user.franchise.preferences as Record<string, unknown>)
        : null;

    const franchiseTimezone =
      typeof prefs?.timezone === 'string' && prefs.timezone.trim()
        ? prefs.timezone.trim()
        : null;
    const platformTimezone = await this.businessTimezone.getPlatformTimezone();
    const timezone = resolveBusinessTimezone({
      franchiseTimezone,
      platformTimezone,
    });
    const language =
      typeof prefs?.language === 'string' && prefs.language.trim()
        ? prefs.language.trim()
        : 'en';

    return {
      ...(await this.toPublicUser(user)),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      salonName: user.salon?.name ?? null,
      timezone,
      language,
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
