import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSalonDto } from './create-salon.dto';

/**
 * franchiseId is immutable after create. Reassignment is not supported:
 * salons own bills, inventory and other financial history that must stay
 * attached to the original franchise.
 */
export class UpdateSalonDto extends PartialType(
  OmitType(CreateSalonDto, ['franchiseId'] as const),
) {}
