import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const PURCHASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PurchaseItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 150.5, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax?: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vendorId: string;

  @ApiPropertyOptional({
    example: 'PO-1710000000000',
    description: 'Optional. Auto-generated as PO-{timestamp} when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchaseNumber?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorInvoiceNumber?: string | null;

  @ApiProperty({
    example: '2026-09-16',
    description: 'Calendar date YYYY-MM-DD',
  })
  @Matches(PURCHASE_DATE_PATTERN, {
    message: 'purchaseDate must be YYYY-MM-DD',
  })
  purchaseDate: string;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description:
      'Header-level discount. Defaults to the sum of line discounts when omitted.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description:
      'Header-level tax. Defaults to the sum of line taxes when omitted.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ type: [PurchaseItemInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items: PurchaseItemInputDto[];
}
