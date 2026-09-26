import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class CreateBillDocumentDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'MediaFile whose storageKey, originalFileName, mimeType and fileSize are copied onto the bill document',
  })
  @IsUUID()
  mediaFileId: string;

  @ApiPropertyOptional({
    description: 'Optional public or CDN URL override for the document',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  fileUrl?: string | null;
}
