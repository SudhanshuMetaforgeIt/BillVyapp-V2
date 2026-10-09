import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SalonPhotoType } from '../../generated/prisma/enums';

export class CreateSalonPhotoDto {
  @ApiProperty({
    description: 'Storage key returned by the upload-url endpoint',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  storageKey: string;

  @ApiPropertyOptional({ enum: SalonPhotoType, default: SalonPhotoType.OTHER })
  @IsOptional()
  @IsEnum(SalonPhotoType)
  photoType?: SalonPhotoType;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, this image becomes the salon cover image.',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @StrictNumber()
  @IsInt()
  @Min(0)
  @Max(10000)
  displayOrder?: number;
}
