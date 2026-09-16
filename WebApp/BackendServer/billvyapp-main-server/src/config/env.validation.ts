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

/**
 * Fail-fast validation of the process environment. The application refuses to
 * boot with a missing or weak secret rather than starting in an unsafe state.
 */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

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

  @IsOptional()
  @IsString()
  APP_URL?: string;

  @IsOptional()
  @IsIn(['local', 's3', 'LOCAL', 'S3'])
  STORAGE_PROVIDER?: string;

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

  return validated;
}
