import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AllowDuringMaintenance } from '../common/decorators/allow-during-maintenance.decorator';
import { SkipSubscription } from '../common/decorators/skip-subscription.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from './auth-cookies';
import { AuthService, RequestContext } from './auth.service';
import {
  AuthResponseDto,
  AuthUserDto,
  MessageResponseDto,
  SendOtpResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

@ApiTags('Auth')
@Controller('auth')
@AllowDuringMaintenance()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Staff/admin login with email and password',
    description:
      'Authenticates an existing active account with its password. Refresh token is set as an HttpOnly cookie.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto, this.context(req));
    return this.attachRefreshCookie(res, result);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Public customer self-registration',
    description:
      'Unavailable until account ownership verification is integrated. Returns OWNERSHIP_VERIFICATION_REQUIRED without creating an account or issuing credentials.',
  })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'Ownership verification required' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Email or phone already registered',
  })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(
    @Body() dto: RegisterCustomerDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto, this.context(req));
    return this.attachRefreshCookie(res, result);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request a login code for a 10-digit Indian mobile number',
    description:
      'Always returns the same message regardless of whether the number is registered. In non-production, `devOtp` may be included when DEV_OTP_ENABLED=true.',
  })
  @ApiResponse({ status: 200, type: SendOtpResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid phone format' })
  @ApiResponse({ status: 429, description: 'Too many code requests' })
  sendOtp(
    @Body() dto: SendOtpDto,
    @Req() req: Request,
  ): Promise<SendOtpResponseDto> {
    return this.authService.sendOtp(dto, this.context(req));
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Exchange a valid OTP for tokens',
    description:
      'Authenticates an existing CUSTOMER matched on users.phone. Never creates a user or customer record. OTP is single-use. Refresh token is set as an HttpOnly cookie.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.verifyOtp(dto, this.context(req));
    return this.attachRefreshCookie(res, result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate an access token',
    description:
      'Reads the HttpOnly refresh cookie (body refreshToken is a fallback). The presented refresh token is revoked and a new session is issued (refresh-token rotation).',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = this.readRefreshToken(req, dto.refreshToken);
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const result = await this.authService.refresh(
      refreshToken,
      this.context(req),
    );
    return this.attachRefreshCookie(res, result);
  }

  @ApiBearerAuth()
  @SkipSubscription()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LogoutDto = {},
  ): Promise<MessageResponseDto> {
    const cookieToken = this.readRefreshToken(req, undefined);
    const result = await this.authService.logout(
      user,
      {
        refreshToken: dto.refreshToken ?? cookieToken ?? undefined,
      },
      this.context(req),
    );
    clearRefreshCookie(res, this.cookieSecure());
    return result;
  }

  @ApiBearerAuth()
  @SkipSubscription()
  @Get('me')
  @ApiOperation({
    summary: 'Return the authenticated user',
    description:
      'Authoritative identity for the frontend. Never includes passwordHash, refresh tokens, or secrets.',
  })
  @ApiResponse({ status: 200, type: AuthUserDto })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserDto> {
    return this.authService.me(user);
  }

  private attachRefreshCookie<T extends TokenBundle>(
    res: Response,
    result: T,
  ): Omit<T, 'refreshToken'> {
    setRefreshCookie(
      res,
      result.refreshToken,
      this.refreshMaxAgeMs(),
      this.cookieSecure(),
    );
    const { refreshToken, ...publicResult } = result;
    void refreshToken;
    return publicResult;
  }

  private readRefreshToken(
    req: Request,
    bodyToken?: string,
  ): string | undefined {
    const fromCookie: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof fromCookie === 'string' && fromCookie.length > 0) {
      return fromCookie;
    }
    if (typeof bodyToken === 'string' && bodyToken.length > 0) {
      return bodyToken;
    }
    return undefined;
  }

  private cookieSecure(): boolean {
    return this.config.get<string>('nodeEnv') === 'production';
  }

  private refreshMaxAgeMs(): number {
    const raw = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
    return this.parseDurationMs(raw);
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/i.exec(duration.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return amount * (multipliers[unit] ?? 86_400_000);
  }

  private context(req: Request): RequestContext {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
