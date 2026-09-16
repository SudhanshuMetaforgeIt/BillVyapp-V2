import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { OptionalBooleanTransform } from '../../common/transformers/optional-boolean';

export class VendorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'beauty' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  isActive?: boolean;
}
