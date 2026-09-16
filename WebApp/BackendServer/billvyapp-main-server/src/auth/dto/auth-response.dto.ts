import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true, example: '9876543210' }) phone: string | null;
  @ApiProperty({ example: 'ADMIN' }) role: string;
  @ApiProperty({ nullable: true }) franchiseId: string | null;
  @ApiProperty({ nullable: true }) salonId: string | null;
  @ApiProperty({ nullable: true }) profilePhoto: string | null;
  @ApiProperty() isActive: boolean;
}

export class AuthTokensDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: string;
}

export class AuthResponseDto extends AuthTokensDto {
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'OTP request processed successfully.' })
  message: string;
}

export class SendOtpResponseDto {
  @ApiProperty({ example: 'OTP request processed successfully.' })
  message: string;

  @ApiPropertyOptional({
    example: '482913',
    description:
      'Returned only when NODE_ENV is not production AND DEV_OTP_ENABLED=true. Never present in production.',
  })
  devOtp?: string;
}
