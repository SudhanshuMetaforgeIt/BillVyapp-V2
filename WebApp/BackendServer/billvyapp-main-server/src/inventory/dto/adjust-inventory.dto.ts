import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  NotEquals,
} from 'class-validator';
import {
  ADJUSTABLE_MOVEMENT_TYPES,
  StockMovementType,
} from '../../common/enums/stock-movement-type.enum';

export class AdjustInventoryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: -2,
    description:
      'Signed delta applied to quantityOnHand. Resulting on-hand must not be negative.',
  })
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-1000000)
  @Max(1000000)
  @NotEquals(0, { message: 'quantity must be a non-zero signed quantity' })
  quantity: number;

  @ApiProperty({
    enum: ADJUSTABLE_MOVEMENT_TYPES,
    example: StockMovementType.ADJUSTMENT,
  })
  @IsIn(ADJUSTABLE_MOVEMENT_TYPES)
  movementType: StockMovementType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
