import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export const MEMBERSHIP_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMembershipDto {
  @ApiProperty({
    description: 'Stable key reused for retries of an approved free enrollment',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,190}$/)
  idempotencyKey?: string;
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required for staff/admin callers. Ignored for CUSTOMER callers — identity is taken from the authenticated user.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membershipPlanId: string;

  @ApiPropertyOptional({
    example: '2099-01-15',
    description:
      'Calendar start date YYYY-MM-DD. Defaults to today when omitted. endDate is startDate + plan.durationDays.',
  })
  @IsOptional()
  @Matches(MEMBERSHIP_DATE_PATTERN, {
    message: 'startDate must be YYYY-MM-DD',
  })
  startDate?: string;
}
