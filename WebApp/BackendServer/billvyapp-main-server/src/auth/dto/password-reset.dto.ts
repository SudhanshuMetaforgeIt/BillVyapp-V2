import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const RESET_ID_PATTERN = /^[a-f0-9]{64}$/;
export class RequestPasswordResetDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(191)
  email: string;
}
export class VerifyPasswordResetOtpDto {
  @ApiProperty() @Matches(RESET_ID_PATTERN) challengeId: string;
  @ApiProperty() @Matches(/^\d{6}$/) code: string;
}
export class ResetPasswordDto {
  @ApiProperty() @Matches(RESET_ID_PATTERN) challengeId: string;
  @ApiProperty() @Matches(RESET_ID_PATTERN) resetToken: string;
  @ApiProperty() @IsString() @MinLength(6) @MaxLength(128) newPassword: string;
}
export class PasswordResetChallengeDto {
  @ApiProperty() challengeId: string;
  @ApiProperty() message: string;
  @ApiProperty() expiresInSeconds: number;
  @ApiProperty() resendAfterSeconds: number;
}
export class PasswordResetVerifiedDto {
  @ApiProperty() resetToken: string;
  @ApiProperty() expiresInSeconds: number;
}
