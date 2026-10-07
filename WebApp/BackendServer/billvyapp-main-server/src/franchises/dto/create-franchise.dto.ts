import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateFranchiseDto {
  @ApiPropertyOptional({ enum: ['IN', 'US'] })
  @IsOptional()
  @IsIn(['IN', 'US'])
  phoneCountry?: 'IN' | 'US';
  @ApiProperty({ example: 'North India' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiProperty({ example: 'NORTH' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9]+$/, {
    message: 'code must contain only letters and numbers',
  })
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
