import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { LoyaltyTransactionType } from '../../common/enums/loyalty-transaction-type.enum';

export class CreateLoyaltyTransactionDto {
  @ApiProperty({
    description: 'Stable key reused for retries of this adjustment',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,190}$/)
  idempotencyKey?: string;
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Optional salon. Null is allowed for head-office / promotional adjustments.',
  })
  @IsOptional()
  @IsUUID()
  salonId?: string | null;

  @ApiProperty({
    example: 100,
    description:
      'Signed points delta. REDEEMED requires points < 0; EARNED/BONUS require points > 0; ADJUSTED may be either.',
  })
  @StrictNumber()
  @IsInt()
  points: number;

  @ApiProperty({ enum: LoyaltyTransactionType })
  @IsEnum(LoyaltyTransactionType)
  transactionType: LoyaltyTransactionType;

  @ApiPropertyOptional({ example: 'Bill', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  referenceId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}
