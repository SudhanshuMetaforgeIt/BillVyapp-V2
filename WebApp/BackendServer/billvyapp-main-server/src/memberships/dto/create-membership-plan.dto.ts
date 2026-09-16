import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMembershipPlanDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ example: 'Gold Annual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 4999.0, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({
    example: 365,
    minimum: 1,
    description: 'Plan length in calendar days',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays: number;
}
