import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    required: false,
    description:
      'Optional refresh token. When provided, that session is revoked in addition to the session bound to the access token.',
  })
  @IsOptional()
  @IsJWT({ message: 'refreshToken must be a valid token' })
  refreshToken?: string;
}
