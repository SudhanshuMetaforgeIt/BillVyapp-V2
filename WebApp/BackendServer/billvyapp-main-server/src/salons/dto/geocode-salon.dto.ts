import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class GeocodeSalonDto {
  @ApiPropertyOptional({
    example: '12 MG Road, Bengaluru, Karnataka 560001',
    description: 'Free-form address to geocode. Required when placeId is omitted.',
  })
  @ValidateIf((o: GeocodeSalonDto) => !o.placeId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  address?: string;

  @ApiPropertyOptional({
    example: 'ChIJLfyY2E4UrjsRVq4k1aqjQZg',
    description:
      'Google Place ID. Required when address is omitted. Preferred when both are sent.',
  })
  @ValidateIf((o: GeocodeSalonDto) => !o.address)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  placeId?: string;
}
