import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { IsIndianMobileNumber } from '../../common/validators/indian-phone.decorator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Riya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Kapoor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'riya.kapoor@example.com' })
  @IsEmail()
  @MaxLength(191)
  email: string;

  @IsIndianMobileNumber()
  phone: string;

  @ApiPropertyOptional({ example: '1992-04-18', type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ enum: Gender, example: Gender.FEMALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  profilePhoto?: string | null;
}
