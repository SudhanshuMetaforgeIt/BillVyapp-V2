import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued at login' })
  @IsJWT({ message: 'refreshToken must be a valid token' })
  refreshToken: string;
}
