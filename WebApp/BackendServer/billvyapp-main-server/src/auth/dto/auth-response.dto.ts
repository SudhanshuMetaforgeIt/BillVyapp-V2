import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ example: 'MANAGER' }) role: string;
  @ApiProperty({ nullable: true }) franchiseId: string | null;
  @ApiProperty({ nullable: true }) salonId: string | null;
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
  @ApiProperty({
    example: 'If the number is registered, a code has been sent.',
  })
  message: string;
}
