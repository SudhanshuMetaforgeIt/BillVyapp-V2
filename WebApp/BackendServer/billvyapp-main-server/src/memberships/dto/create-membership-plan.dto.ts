import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  ArrayUnique,
  IsBoolean,
  Matches,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class CreateMembershipPlanDto {
  @ApiPropertyOptional({ default: false })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  freeServicesPerVisit?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 1,
    description:
      'Maximum completed visits receiving a membership benefit; null means no additional visit cap',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  couponUsageLimit?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  termsAndConditions?: string | null;

  @ApiPropertyOptional({
    enum: ['NONE', 'FREE_SERVICES', 'PERCENTAGE_DISCOUNT'],
    default: 'NONE',
  })
  @IsOptional()
  @IsEnum({
    NONE: 'NONE',
    FREE_SERVICES: 'FREE_SERVICES',
    PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  })
  benefitType?: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  freeServiceLimit?: number | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ example: 'Gold Annual' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'name must contain non-whitespace characters' })
  @MaxLength(191)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 4999.0, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  price: number;

  @ApiProperty({
    example: 365,
    minimum: 1,
    description: 'Plan length in calendar days',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays: number;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Null disables automatic enrollment',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  enrollmentThreshold?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  benefits?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  eligibleServiceIds?: string[];

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Legacy field retained for compatibility; ignored for coupon generation. Franchise code is authoritative.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/)
  @MaxLength(32)
  couponPrefix?: string | null;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
