import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
} from '../attachment-validation';

export class CreateMediaUploadDto {
  @ApiProperty({ example: 'receipt.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsIn(ATTACHMENT_MIME_TYPES)
  mimeType: string;

  @ApiProperty({ example: 204800, minimum: 1 })
  @StrictNumber()
  @IsInt()
  @Min(1)
  @Max(ATTACHMENT_MAX_BYTES)
  fileSize: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ example: 'Bill' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
