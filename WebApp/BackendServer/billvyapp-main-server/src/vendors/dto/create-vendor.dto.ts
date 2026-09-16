import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsOptionalIndianMobileNumber } from '../../common/validators/indian-phone.decorator';

export class CreateVendorDto {
  @ApiProperty({ example: 'Beauty Supplies Co' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @ApiProperty({ example: 'BSC01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'Amit Sharma', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  contactPerson?: string | null;

  @IsOptionalIndianMobileNumber()
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'orders@beautysupplies.example',
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string | null;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNumber?: string | null;

  @ApiPropertyOptional({ example: '12 Warehouse Road', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: 'New Delhi', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ example: 'Delhi', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string | null;

  @ApiPropertyOptional({ example: 'India', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string | null;

  @ApiPropertyOptional({ example: '110001', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({
    example: 28.6328,
    description: 'Decimal(10,7), range -90 to 90',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({
    example: 77.2197,
    description: 'Decimal(10,7), range -180 to 180',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
