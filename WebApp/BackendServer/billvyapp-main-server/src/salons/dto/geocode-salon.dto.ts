import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GeocodeSalonDto {
  @ApiPropertyOptional({
    example: '12 MG Road, Bengaluru, Karnataka 560001',
    description:
      'Free-form address to geocode. When omitted (and placeId is also omitted), the salon stored address is used.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  address?: string;

  @ApiPropertyOptional({
    example: 'ChIJLfyY2E4UrjsRVq4k1aqjQZg',
    description:
      'Google Place ID; supported when GEOCODING_PROVIDER=google. Use an address for OpenCage.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  placeId?: string;
}
