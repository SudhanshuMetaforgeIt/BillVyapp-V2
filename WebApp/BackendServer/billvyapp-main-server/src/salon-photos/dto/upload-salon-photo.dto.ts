import {
  IntersectionType,
  OmitType,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { CreateSalonPhotoDto } from './create-salon-photo.dto';
import { CreateSalonPhotoUploadDto } from './create-salon-photo-upload.dto';

/** Query metadata for raw authenticated image uploads; reuses existing validators. */
export class UploadSalonPhotoDto extends IntersectionType(
  CreateSalonPhotoUploadDto,
  OmitType(CreateSalonPhotoDto, ['storageKey', 'isPrimary'] as const),
) {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  isPrimary?: string;

  @ApiPropertyOptional({
    description: 'Replace this photo in the same salon, preserving its ID',
  })
  @IsOptional()
  @IsUUID()
  replaceId?: string;
}
