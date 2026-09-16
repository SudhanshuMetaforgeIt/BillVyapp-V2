import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { OptionalBooleanTransform } from '../../common/transformers/optional-boolean';

export class ProductCategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'hair' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'CUSTOMER callers always receive active categories only, regardless of this filter.',
  })
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  isActive?: boolean;
}
