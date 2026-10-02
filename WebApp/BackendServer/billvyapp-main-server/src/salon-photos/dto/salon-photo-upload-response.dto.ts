import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalonPhotoUploadResponseDto {
  @ApiProperty() storageKey: string;
  @ApiProperty() uploadUrl: string;
  @ApiProperty({ enum: ['POST', 'PUT'] }) uploadMethod: 'POST' | 'PUT';
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Multipart fields when the selected provider uses POST uploads.',
  })
  uploadFields?: Record<string, string>;
  @ApiProperty() expiresInSeconds: number;
}
