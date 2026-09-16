import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class LoyaltyBalanceQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required for staff/admin callers. Ignored for CUSTOMER callers — identity is taken from the authenticated user.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
