import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: '9876543210',
    description:
      'Indian mobile number: exactly 10 digits, no +91 prefix, no spaces or symbols.',
  })
  @Matches(/^[0-9]{10}$/, {
    message: 'phone must be exactly 10 digits with no country code',
  })
  phone: string;
}
