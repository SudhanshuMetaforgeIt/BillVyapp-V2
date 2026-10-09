import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { allowedBrowserOrigins } from '../common/security/browser-origin-policy';
import { databaseSecurity } from '../prisma/database-security';
import { redisConnectionOptions } from '../redis/redis-security';

/**
 * Fail-fast validation of the process environment. The application refuses to
 * boot with a missing or weak secret rather than starting in an unsafe state.
 */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;
  @IsOptional() @IsIn(['required', 'disabled']) DATABASE_TLS_MODE?: string;
  @IsOptional() @IsString() DATABASE_TLS_CA_PATH?: string;
  @IsOptional() @IsString() DATABASE_BACKUP_URL?: string;
  @IsOptional() @IsString() DATABASE_BACKUP_ROOT?: string;
  @IsOptional() @IsString() DATABASE_BACKUP_ENCRYPTION_KEY?: string;
  @IsOptional() @IsString() UPLOAD_CLAMSCAN_PATH?: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters',
  })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters',
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  OTP_EXPIRY_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  OTP_MAX_ATTEMPTS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  OTP_RESEND_SECONDS?: number;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional() @IsString() REDIS_TLS_CA_PATH?: string;

  @IsOptional()
  @IsString()
  APP_URL?: string;

  @IsOptional()
  @IsIn(['local', 's3', 'LOCAL', 'S3'])
  STORAGE_PROVIDER?: string;

  @IsOptional()
  @IsIn(['local', 's3', 'cloudinary', 'LOCAL', 'S3', 'CLOUDINARY'])
  PROFILE_PHOTO_STORAGE_PROVIDER?: string;

  @IsOptional()
  @IsString()
  STORAGE_LOCAL_ROOT?: string;

  @IsOptional()
  @IsString()
  STORAGE_SIGNING_SECRET?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  STORAGE_PRESIGN_EXPIRES_SECONDS?: number;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsOptional()
  @IsString()
  S3_BUCKET?: string;

  @IsOptional()
  @IsString()
  S3_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  S3_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === true || value === 'true' || value === '1';
  })
  @IsBoolean()
  S3_FORCE_PATH_STYLE?: boolean;

  @IsOptional()
  @IsInt()
  @Min(60)
  S3_PRESIGN_EXPIRES_SECONDS?: number;

  @IsOptional()
  @IsIn(['cloudinary', 's3', 'CLOUDINARY', 'S3'])
  SALON_IMAGE_STORAGE_PROVIDER?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  CLOUDINARY_UPLOAD_EXPIRES_SECONDS?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === true || value === 'true' || value === '1';
  })
  @IsBoolean()
  DEV_OTP_ENABLED?: boolean;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  GOOGLE_MAPS_API_KEY?: string;

  @IsOptional()
  @IsString()
  GOOGLE_API_KEY?: string;

  @IsOptional()
  @IsIn(['opencage', 'google'])
  GEOCODING_PROVIDER?: string;

  @IsOptional()
  @IsString()
  OPENCAGE_API_KEY?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => '  - ' + Object.values(e.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error('Invalid environment configuration:\n' + details);
  }

  if (validated.JWT_ACCESS_SECRET === validated.JWT_REFRESH_SECRET) {
    throw new Error(
      'Invalid environment configuration:\n  - JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
    );
  }

  const duration = (value: string) => {
    const match = /^(\d+)([smhd])$/i.exec(value.trim());
    if (!match) return NaN;
    return (
      Number(match[1]) *
      ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2].toLowerCase()] ?? NaN)
    );
  };
  const accessSeconds = duration(validated.JWT_ACCESS_EXPIRES_IN);
  const refreshSeconds = duration(validated.JWT_REFRESH_EXPIRES_IN);
  if (
    !Number.isFinite(accessSeconds) ||
    accessSeconds < 60 ||
    accessSeconds > 3600 ||
    !Number.isFinite(refreshSeconds) ||
    refreshSeconds < 60 ||
    refreshSeconds > 30 * 86400
  ) {
    throw new Error(
      'JWT expiry must use s/m/h/d: access 1 minute–1 hour, refresh 1 minute–30 days',
    );
  }
  if (validated.NODE_ENV === 'production') {
    allowedBrowserOrigins(validated.CORS_ORIGIN ?? '*', true);
    if (validated.DEV_OTP_ENABLED)
      throw new Error('Development OTP mode is forbidden in production');
  }

  databaseSecurity(validated.DATABASE_URL, {
    production: validated.NODE_ENV === 'production',
    tlsMode: validated.DATABASE_TLS_MODE,
    caPath: validated.DATABASE_TLS_CA_PATH,
  });
  redisConnectionOptions(
    validated.REDIS_URL ?? 'redis://localhost:6379',
    validated.NODE_ENV === 'production',
    validated.REDIS_TLS_CA_PATH,
  );
  return validated;
}
