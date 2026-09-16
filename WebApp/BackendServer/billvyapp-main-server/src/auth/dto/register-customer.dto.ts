import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIndianMobileNumber } from '../../common/validators/indian-phone.decorator';

/**
 * Public customer self-registration.
 *
 * Intentionally omits role, roleId, franchiseId, salonId and permissions.
 * With ValidationPipe forbidNonWhitelisted, any of those fields in the
 * request body produce HTTP 400. The service always assigns CUSTOMER.
 */
export class RegisterCustomerDto {
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
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(191)
  email: string;

  @IsIndianMobileNumber()
  phone: string;

  @ApiProperty({ example: 'S3cure!Pass', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
