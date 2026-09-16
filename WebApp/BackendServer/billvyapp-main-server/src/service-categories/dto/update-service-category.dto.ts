import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateServiceCategoryDto } from './create-service-category.dto';

/** salonId is immutable after create. */
export class UpdateServiceCategoryDto extends PartialType(
  OmitType(CreateServiceCategoryDto, ['salonId'] as const),
) {}
