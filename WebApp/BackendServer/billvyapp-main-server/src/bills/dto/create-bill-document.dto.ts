import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateBillDocumentDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'MediaFile whose storageKey, originalFileName, mimeType and fileSize are copied onto the bill document',
  })
  @IsUUID()
  mediaFileId: string;
}
