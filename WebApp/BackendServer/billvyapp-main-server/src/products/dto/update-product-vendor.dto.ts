import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductVendorDto {
  @ApiPropertyOptional({
    example: 'VPC-1001',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorProductCode?: string | null;

  @ApiPropertyOptional({
    example: 120.5,
    nullable: true,
  })
  @IsOptional()
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
