import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AllowDuringMaintenance } from '../common/decorators/allow-during-maintenance.decorator';
import { requestContext } from '../common/http/request-context';
import { PasswordResetService } from './password-reset.service';
import {
  PasswordResetChallengeDto,
  PasswordResetVerifiedDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyPasswordResetOtpDto,
} from './dto/password-reset.dto';

@ApiTags('Auth')
@Controller('auth')
@AllowDuringMaintenance()
export class PasswordResetController {
  constructor(private readonly resets: PasswordResetService) {}
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset code by email' })
  @ApiResponse({ status: 200, type: PasswordResetChallengeDto })
  requestCode(@Body() dto: RequestPasswordResetDto) {
    return this.resets.requestCode(dto.email);
  }
  @Public()
  @Post('verify-password-reset-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify a single-use password recovery code' })
  @ApiResponse({ status: 200, type: PasswordResetVerifiedDto })
  verifyCode(@Body() dto: VerifyPasswordResetOtpDto) {
    return this.resets.verifyCode(dto);
  }
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Set a new password and revoke existing sessions' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.resets.resetPassword(dto, requestContext(req));
  }
}
