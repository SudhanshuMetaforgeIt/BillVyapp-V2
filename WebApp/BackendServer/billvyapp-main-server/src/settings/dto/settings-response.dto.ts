import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class GeneralSettingsResponseDto {
  @ApiProperty() platformName: string;
  @ApiPropertyOptional({ nullable: true }) tagline: string | null;
  @ApiProperty() adminEmail: string;
  @ApiPropertyOptional({ nullable: true }) contactNumber: string | null;
  @ApiProperty() timezone: string;
  @ApiProperty() dateFormat: string;
  @ApiProperty() maintenanceMode: boolean;
  @ApiPropertyOptional({ nullable: true }) logoMediaFileId: string | null;
  @ApiPropertyOptional({ nullable: true }) faviconMediaFileId: string | null;
  @ApiPropertyOptional({ nullable: true }) primaryColor: string | null;
  @ApiPropertyOptional({ nullable: true }) secondaryColor: string | null;
  @ApiProperty() updatedAt: Date;
}

export class PasswordPolicyResponseDto {
  @ApiProperty() minLength: number;
  @ApiProperty() requireUppercase: boolean;
  @ApiProperty() requireLowercase: boolean;
  @ApiProperty() requireNumbers: boolean;
  @ApiProperty() requireSpecial: boolean;
}

export class SessionSettingsResponseDto {
  @ApiProperty() timeoutMinutes: number;
  @ApiProperty() maxLoginAttempts: number;
  @ApiProperty() lockoutDurationMinutes: number;
}

export class SecuritySettingsResponseDto {
  @ApiProperty({ type: PasswordPolicyResponseDto })
  passwordPolicy: PasswordPolicyResponseDto;

  @ApiProperty({ type: SessionSettingsResponseDto })
  session: SessionSettingsResponseDto;
}

export class LogRetentionResponseDto {
  @ApiProperty() retentionDays: number;

  @ApiPropertyOptional({
    description:
      'Number of audit rows deleted when retention was saved (immediate purge).',
  })
  purged?: number;
}

export class LogPurgeResponseDto {
  @ApiProperty({ example: 'Purged 12 expired log entries.' })
  message: string;

  @ApiProperty()
  deleted: number;

  @ApiProperty()
  retentionDays: number;

  @ApiProperty()
  cutoff: Date;
}

export class EmailSettingsResponseDto {
  @ApiPropertyOptional({ nullable: true }) smtpHost: string | null;
  @ApiPropertyOptional({ nullable: true }) smtpPort: number | null;
  @ApiPropertyOptional({ nullable: true }) smtpUser: string | null;
  @ApiProperty({
    description:
      'True when a password is stored. The password value is never returned.',
  })
  smtpPasswordSet: boolean;
  @ApiPropertyOptional({ nullable: true }) smtpFromEmail: string | null;
  @ApiPropertyOptional({ nullable: true }) smtpFromName: string | null;
  @ApiProperty() smtpSecure: boolean;
}

export class NotificationsSettingsResponseDto {
  @ApiPropertyOptional({ nullable: true })
  notificationDefaults: Record<string, unknown> | null;
}

export class SystemSettingsResponseDto {
  @ApiPropertyOptional({ nullable: true })
  systemConfig: Record<string, unknown> | null;
}

export class IntegrationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() provider: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Config with known secret keys redacted.',
  })
  config: Record<string, unknown> | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Cache cleared.' })
  message: string;

  @ApiPropertyOptional()
  deletedKeys?: number;
}

export class SettingsBackupResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() createdBy: string | null;
  @ApiProperty({ description: 'Snapshot size in bytes on disk.' })
  sizeBytes: number;
  @ApiProperty({ example: 'Platform settings snapshot created.' })
  message: string;
}

export class SettingsBackupListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ nullable: true }) createdBy: string | null;
  @ApiProperty() sizeBytes: number;
}

export class SystemUpdateStatusDto {
  @ApiProperty({ example: '0.0.1' })
  currentVersion: string;

  @ApiProperty({ example: '0.0.1' })
  latestVersion: string;

  @ApiProperty()
  updateAvailable: boolean;

  @ApiProperty({ example: 'Platform is up to date.' })
  message: string;

  @ApiProperty()
  checkedAt: Date;
}

export class AuditActivityResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) userId: string | null;
  @ApiProperty() action: string;
  @ApiProperty() entityType: string;
  @ApiPropertyOptional({ nullable: true }) entityId: string | null;
  @ApiPropertyOptional({ nullable: true }) oldData: unknown;
  @ApiPropertyOptional({ nullable: true }) newData: unknown;
  @ApiPropertyOptional({ nullable: true }) ipAddress: string | null;
  @ApiProperty() createdAt: Date;
}

export class ActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'SETTINGS_GENERAL_UPDATED' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ example: 'PlatformSettings' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;
}

export class LogsQueryDto extends PaginationQueryDto {}

export class PaginatedActivityDto {
  @ApiProperty({ type: [AuditActivityResponseDto] })
  data: AuditActivityResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
