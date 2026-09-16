import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export const MEMBERSHIP_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMembershipDto {
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
