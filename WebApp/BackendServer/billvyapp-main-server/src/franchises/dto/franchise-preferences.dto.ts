import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class FranchisePreferencesDto {
  @ApiPropertyOptional({
    enum: ['IN', 'US'],
    description:
      'Default phone country inherited by salons and phone entry forms',
  })
  @IsOptional()
  @IsString()
  phoneCountry?: string;
  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ example: 'DD MMM YYYY' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  dateFormat?: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  timeFormat?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  billPrint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lowStockAlert?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  walkInCustomerRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptCash?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptUpi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptCard?: boolean;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  defaultTaxRate?: number;
}

export class UpdateFranchisePreferencesDto {
  @ApiPropertyOptional({ type: FranchisePreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FranchisePreferencesDto)
  preferences?: FranchisePreferencesDto;
}
