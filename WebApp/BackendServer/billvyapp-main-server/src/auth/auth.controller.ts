import {
  Body,
  Controller,
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
  MessageResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
  @ApiOperation({ summary: 'Staff/admin login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.context(req));
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request a login code for a 10-digit Indian mobile number',
    description:
      'Always returns the same message regardless of whether the number is registered, so the endpoint cannot be used to enumerate accounts.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 429, description: 'Too many code requests' })
  sendOtp(@Body() dto: SendOtpDto): Promise<MessageResponseDto> {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Exchange a valid code for tokens',
    description:
      'Authenticates an existing user matched on users.phone. Never creates a user or customer record.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
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
      'The presented refresh token is revoked and a new session is issued.',
  })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
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
  ): Promise<MessageResponseDto> {
    return this.authService.logout(user, this.context(req));
  }

  private context(req: Request): RequestContext {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
