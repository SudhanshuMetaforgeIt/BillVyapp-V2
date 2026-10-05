import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMembershipPlanDto } from './create-membership-plan.dto';

/**
 * salonId is immutable after create — membership history stays attached to the
 * original salon.
 */
export class UpdateMembershipPlanDto extends PartialType(
  OmitType(CreateMembershipPlanDto, ['salonId', 'isActive'] as const),
  { skipNullProperties: false },
) {}
