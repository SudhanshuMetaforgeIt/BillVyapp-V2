import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({ example: 'BillVyApp' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  platformName?: string;

  @ApiPropertyOptional({ example: 'Smart Billing. Simplified.', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  tagline?: string | null;

  @ApiPropertyOptional({ example: 'admin@billvyapp.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  adminEmail?: string;

  @ApiPropertyOptional({ example: '9876543210', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  contactNumber?: string | null;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'DD MMM YYYY' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  dateFormat?: string;
}

export class UpdateBrandingSettingsDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  logoMediaFileId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  faviconMediaFileId?: string | null;

  @ApiPropertyOptional({ example: '#FF9800', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsHexColor()
  primaryColor?: string | null;

  @ApiPropertyOptional({ example: '#071014', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsHexColor()
  secondaryColor?: string | null;
}

export class UpdateMaintenanceSettingsDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  enabled: boolean;
}

export class UpdatePasswordPolicyDto {
  @ApiPropertyOptional({ example: 8, minimum: 6, maximum: 128 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(128)
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireNumbers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireSpecial?: boolean;
}

export class UpdateSessionSettingsDto {
  @ApiPropertyOptional({ example: 30, minimum: 5, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  timeoutMinutes?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxLoginAttempts?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  lockoutDurationMinutes?: number;
}

export class UpdateLogRetentionDto {
  @ApiProperty({ example: 90, minimum: 1, maximum: 3650 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays: number;
}

export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ example: 'smtp.example.com', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(191)
  smtpHost?: string | null;

  @ApiPropertyOptional({ example: 587, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(191)
  smtpUser?: string | null;

  @ApiPropertyOptional({
    description: 'Write-only. Never returned by GET.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(512)
  smtpPassword?: string | null;

  @ApiPropertyOptional({ example: 'noreply@billvyapp.com', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEmail()
  @MaxLength(191)
  smtpFromEmail?: string | null;

  @ApiPropertyOptional({ example: 'BillVyApp', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  smtpFromName?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;
}

export class TestEmailDto {
  @ApiProperty({ example: 'admin@billvyapp.com' })
  @IsEmail()
  @MaxLength(191)
  to: string;
}

export class UpdateNotificationsSettingsDto {
  @ApiPropertyOptional({
    description: 'Channel / preference defaults as a JSON object (no secrets).',
    example: { emailEnabled: true, smsEnabled: false, whatsappEnabled: true },
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  notificationDefaults?: Record<string, unknown> | null;
}

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({
    description: 'Feature flags / runtime toggles as a JSON object (no secrets).',
    example: { maxFranchises: 500, enableOtpLogin: true },
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  systemConfig?: Record<string, unknown> | null;
}

export class ConfirmDestructiveDto {
  @ApiProperty({
    example: true,
    description: 'Must be true to proceed with a destructive action.',
  })
  @IsBoolean()
  confirm: boolean;
}

export class ConfirmResetDto extends ConfirmDestructiveDto {
  @ApiProperty({
    example: 'RESET',
    description: 'Must equal RESET (case-sensitive).',
  })
  @IsString()
  @Matches(/^RESET$/)
  confirmationPhrase: string;
}

export class CreateIntegrationDto {
  @ApiProperty({ example: 'Razorpay' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'RAZORPAY' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provider: string;

  @ApiPropertyOptional({ example: 'INACTIVE', enum: ['ACTIVE', 'INACTIVE', 'ERROR'] })
  @IsOptional()
  @IsString()
  @Matches(/^(ACTIVE|INACTIVE|ERROR)$/)
  status?: string;

  @ApiPropertyOptional({
    description: 'Provider config. Secret keys are redacted on read.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  config?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ example: 'Razorpay Live' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE', 'ERROR'] })
  @IsOptional()
  @IsString()
  @Matches(/^(ACTIVE|INACTIVE|ERROR)$/)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  config?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BrandingUploadDto {
  @ApiProperty({ example: 'logo.png' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @ApiProperty({ example: 20480, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  fileSize: number;
}
