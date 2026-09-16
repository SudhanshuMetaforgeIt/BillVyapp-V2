import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ example: 'Hair Care' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}
