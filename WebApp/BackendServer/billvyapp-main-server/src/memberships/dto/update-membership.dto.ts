import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import { MEMBERSHIP_DATE_PATTERN } from './create-membership.dto';

/**
 * Limited mutable fields. customerId and status are not accepted here —
 * status changes go through PATCH :id/status.
 */
export class UpdateMembershipDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  membershipPlanId?: string;

  @ApiPropertyOptional({
    example: '2099-01-15',
    description:
      'When changed (or when plan changes), endDate is recalculated as startDate + plan.durationDays.',
  })
  @IsOptional()
  @Matches(MEMBERSHIP_DATE_PATTERN, {
    message: 'startDate must be YYYY-MM-DD',
  })
  startDate?: string;
}
