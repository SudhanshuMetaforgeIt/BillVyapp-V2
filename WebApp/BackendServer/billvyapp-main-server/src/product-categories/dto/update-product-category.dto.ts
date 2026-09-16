import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductCategoryDto } from './create-product-category.dto';

/** salonId is immutable after create. */
export class UpdateProductCategoryDto extends PartialType(
  OmitType(CreateProductCategoryDto, ['salonId'] as const),
) {}
