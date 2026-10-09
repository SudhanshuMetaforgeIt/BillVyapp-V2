import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkServiceItemDto {
  @ApiPropertyOptional({ example: 'Hair Cut' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiPropertyOptional({ example: 'Hair' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  category: string;

  @ApiPropertyOptional({ example: 500 })
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 30 })
  @StrictNumber()
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkCreateServicesDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiPropertyOptional({ type: [BulkServiceItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkServiceItemDto)
  services: BulkServiceItemDto[];
}
