import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateBillDto, CreateBillItemDto } from './create-bill.dto';

/**
 * salonId is immutable after create. Only DRAFT bills may be updated.
 * Status is changed via PATCH /bills/:id/status.
 */
export class UpdateBillDto extends PartialType(
  OmitType(CreateBillDto, ['salonId', 'items'] as const),
) {
  @ApiPropertyOptional({ type: [CreateBillItemDto], minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items?: CreateBillItemDto[];
}
