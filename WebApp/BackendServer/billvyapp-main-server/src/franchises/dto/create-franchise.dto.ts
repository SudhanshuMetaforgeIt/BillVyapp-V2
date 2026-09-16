import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFranchiseDto {
  @ApiProperty({ example: 'North India' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiProperty({ example: 'NORTH' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: '01123456789', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'north@billvyapp.com', nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string | null;
}
