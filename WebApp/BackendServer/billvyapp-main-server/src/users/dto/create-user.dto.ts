import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsOptionalIndianMobileNumber } from '../../common/validators/indian-phone.decorator';

export class CreateUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Required for ADMIN, MANAGER and STAFF. Must be null for SUPER_ADMIN.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  franchiseId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Required for MANAGER and STAFF. Must be null for SUPER_ADMIN and ADMIN.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  salonId?: string | null;

  @ApiProperty({ example: 'Priya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'priya.admin@billvyapp.com' })
  @IsEmail()
  @MaxLength(191)
  email: string;

  @IsOptionalIndianMobileNumber()
  phone?: string | null;

  @ApiProperty({ example: 'S3cure!Passw0rd', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  profilePhoto?: string | null;
}
