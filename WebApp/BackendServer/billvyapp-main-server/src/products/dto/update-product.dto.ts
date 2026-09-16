import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * salonId is immutable after create. Products own inventory, purchase and bill
 * history that must stay attached to the original salon.
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['salonId'] as const),
) {}
