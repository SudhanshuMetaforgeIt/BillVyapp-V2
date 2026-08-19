import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'manager@billvyapp.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(191)
  email: string;

  @ApiProperty({ example: 'S3cure!Passw0rd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
