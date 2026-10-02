import { ApiProperty } from '@nestjs/swagger';
import { SalonPhotoType } from '../../generated/prisma/enums';

/** Provider-neutral public shape consumed by the web and mobile clients. */
export class SalonPhotoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() fileName: string;
  @ApiProperty({ description: 'Mobile-optimized public delivery URL' }) fileUrl: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() fileSize: number;
  @ApiProperty({ enum: SalonPhotoType }) photoType: SalonPhotoType;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() displayOrder: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
