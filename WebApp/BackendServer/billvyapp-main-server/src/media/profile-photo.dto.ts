import { StrictNumber } from '../common/transformers/strict-number';
import { ApiProperty } from '@nestjs/swagger';

import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PROFILE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export class InitializeProfilePhotoDto {
  @ApiProperty({ example: 'avatar.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ enum: PROFILE_IMAGE_MIME_TYPES })
  @IsIn(PROFILE_IMAGE_MIME_TYPES)
  mimeType: string;

  @ApiProperty({ minimum: 1, maximum: PROFILE_IMAGE_MAX_BYTES })
  @StrictNumber()
  @IsInt()
  @Min(1)
  @Max(PROFILE_IMAGE_MAX_BYTES)
  fileSize: number;
}

export class FinalizeProfilePhotoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  mediaId: string;
}

export class ProfilePhotoResponseDto {
  @ApiProperty({
    nullable: true,
    description: 'Display URL, or null for the standard initials avatar',
  })
  profilePhoto: string | null;
}

export class ProfilePhotoUploadResponseDto {
  @ApiProperty() mediaId: string;
  @ApiProperty({
    description:
      'Authenticated API path; PUT raw file bytes using the normal bearer token',
  })
  uploadUrl: string;
  @ApiProperty({ enum: ['PUT'] }) uploadMethod: 'PUT';
  @ApiProperty() expiresInSeconds: number;
}
