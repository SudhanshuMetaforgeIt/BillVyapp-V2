import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateSalonPhotoUploadDto {
  @ApiProperty({ example: 'front-elevation.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Matches(/^image\/(jpeg|png|webp|avif)$/i, {
    message: 'mimeType must be jpeg, png, webp, or avif',
  })
  mimeType: string;
}
