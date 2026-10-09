import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const PLATFORM_PLAN_BILLING_CYCLES = [
  'monthly',
  'yearly',
  'custom',
] as const;

export type PlatformPlanBillingCycleApi =
  (typeof PLATFORM_PLAN_BILLING_CYCLES)[number];

export class CreatePlatformPlanDto {
  @ApiProperty({ example: 'Professional' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    example: false,
    description:
      'When true, priceMonthly must be omitted/null (contact sales).',
  })
  @IsBoolean()
  isCustom: boolean;

  @ApiPropertyOptional({
    example: 1199,
    minimum: 0,
    nullable: true,
    description: 'Required when isCustom is false; must be null when isCustom.',
  })
  @ValidateIf((o: CreatePlatformPlanDto) => !o.isCustom)
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMonthly?: number | null;

  @ApiProperty({ enum: PLATFORM_PLAN_BILLING_CYCLES, example: 'monthly' })
  @IsIn(PLATFORM_PLAN_BILLING_CYCLES)
  billingCycle: PlatformPlanBillingCycleApi;

  @ApiPropertyOptional({
    example: 'professional',
    description:
      'UI icon key (basic, professional, premium, enterprise, custom)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iconKey?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional feature bullet list stored as JSON',
  })
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Defaults to true when omitted',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
