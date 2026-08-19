import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @Matches(/^[0-9]{10}$/, {
    message: 'phone must be exactly 10 digits with no country code',
  })
  phone: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^[0-9]{6}$/, { message: 'code must be 6 digits' })
  code: string;
}
