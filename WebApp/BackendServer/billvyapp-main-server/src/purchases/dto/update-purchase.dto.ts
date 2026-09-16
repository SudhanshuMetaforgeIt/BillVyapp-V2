import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseDto, PurchaseItemInputDto } from './create-purchase.dto';

/**
 * salonId is immutable after create. Items may only be replaced while the
 * purchase is still DRAFT (enforced in the service).
 */
export class UpdatePurchaseDto extends PartialType(
  OmitType(CreatePurchaseDto, ['salonId', 'items'] as const),
) {
  @ApiPropertyOptional({ type: [PurchaseItemInputDto], minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items?: PurchaseItemInputDto[];
}
