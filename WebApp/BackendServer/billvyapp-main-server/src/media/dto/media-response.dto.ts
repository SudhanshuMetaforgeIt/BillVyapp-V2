import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MediaFileResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) salonId: string | null;
  @ApiPropertyOptional({ nullable: true }) uploadedBy: string | null;
  @ApiProperty() storageProvider: string;
  @ApiProperty() storageKey: string;
  @ApiProperty() originalFileName: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() fileSize: number;
  @ApiPropertyOptional({ nullable: true }) entityType: string | null;
  @ApiPropertyOptional({ nullable: true }) entityId: string | null;
  @ApiProperty() createdAt: Date;
}

export class MediaUploadResponseDto extends MediaFileResponseDto {
  @ApiProperty({
    description: 'Presigned PUT URL for private bucket upload',
  })
  uploadUrl: string;

  @ApiProperty() expiresInSeconds: number;
}

export class MediaDownloadResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() storageKey: string;
  @ApiProperty({
    description: 'Presigned GET URL for private bucket download',
  })
  downloadUrl: string;

  @ApiProperty() expiresInSeconds: number;
}
