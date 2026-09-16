import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { IsIndianMobileNumber } from '../../common/validators/indian-phone.decorator';

export class VerifyOtpDto {
  @IsIndianMobileNumber()
  phone: string;

  @ApiProperty({ example: '482913', description: '6-digit one-time code' })
  @Matches(/^[0-9]{6}$/, { message: 'otp must be 6 digits' })
  otp: string;
}
