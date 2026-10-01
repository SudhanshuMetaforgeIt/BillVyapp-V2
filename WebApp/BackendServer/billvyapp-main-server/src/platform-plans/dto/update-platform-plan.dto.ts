import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePlatformPlanDto } from './create-platform-plan.dto';

/** Updatable fields — excludes isActive (use PATCH :id/status). */
export class UpdatePlatformPlanDto extends PartialType(
  OmitType(CreatePlatformPlanDto, ['isActive'] as const),
) {}
