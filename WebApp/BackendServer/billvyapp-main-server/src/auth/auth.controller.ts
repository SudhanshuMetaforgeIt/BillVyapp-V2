import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService, RequestContext } from './auth.service';
import {
  AuthResponseDto,
  AuthTokensDto,
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Staff/admin login with email and password',
    description:
      'Authenticates SUPER_ADMIN, ADMIN, MANAGER and STAFF. CUSTOMER accounts must use the OTP flow.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.context(req));
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Public customer self-registration',
    description:
      'Always creates a CUSTOMER account. Role, franchise and salon cannot be supplied by the client; ValidationPipe rejects unknown fields and the service assigns CUSTOMER server-side.',
  })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  register(
    @Body() dto: RegisterCustomerDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.context(req));
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
      'Authenticates an existing CUSTOMER matched on users.phone. Never creates a user or customer record. OTP is single-use.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto, this.context(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate an access token',
    description:
      'The presented refresh token is revoked and a new session is issued (refresh-token rotation).',
  })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken, this.context(req));
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Body() dto: LogoutDto = {},
  ): Promise<MessageResponseDto> {
    return this.authService.logout(user, dto, this.context(req));
  }

  @ApiBearerAuth()
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

  private context(req: Request): RequestContext {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
