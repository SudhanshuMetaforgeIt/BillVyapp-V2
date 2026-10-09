import { StrictNumber } from '../../common/transformers/strict-number';
import { ApiProperty } from '@nestjs/swagger';

import { IsNumber, Max, Min } from 'class-validator';

export class UpdateSalonLocationDto {
  @ApiProperty({
    example: 17.4484658,
    description: 'Confirmed shop entrance latitude',
  })
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    example: 78.357772,
    description: 'Confirmed shop entrance longitude',
  })
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude: number;
}
