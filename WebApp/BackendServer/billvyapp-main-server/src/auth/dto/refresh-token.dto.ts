import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsJWT, IsOptional } from 'class-validator';

/**
 * Body is optional — preferred source is the HttpOnly refresh cookie.
 * Body refreshToken remains accepted for Swagger / non-browser clients.
 */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Optional when the HttpOnly refresh cookie is present. Prefer the cookie.',
  })
  @IsOptional()
  @IsJWT({ message: 'refreshToken must be a valid token' })
  refreshToken?: string;
}
