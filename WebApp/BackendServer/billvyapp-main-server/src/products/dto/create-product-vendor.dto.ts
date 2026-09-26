import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductVendorDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vendorId: string;

  @ApiPropertyOptional({
    example: 'VPC-1001',
    nullable: true,
    description: 'Vendor-specific SKU / product code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorProductCode?: string | null;

  @ApiPropertyOptional({
    example: 120.5,
    description: 'Purchase price Decimal(12,2)',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
