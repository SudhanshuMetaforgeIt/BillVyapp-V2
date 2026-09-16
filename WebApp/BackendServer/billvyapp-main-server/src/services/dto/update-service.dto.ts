import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

/**
 * salonId is immutable after create. Services own appointment and bill history
 * that must stay attached to the original salon.
 */
export class UpdateServiceDto extends PartialType(
  OmitType(CreateServiceDto, ['salonId'] as const),
) {}
