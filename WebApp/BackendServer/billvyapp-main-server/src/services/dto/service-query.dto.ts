import { Gender } from '../../common/enums/gender.enum';
import { IsEnum } from 'class-validator';
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

export class ServiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description:
      'Include Unisex services with the selected gender. Defaults to true.',
  })
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  includeUnisex?: boolean;

  @ApiPropertyOptional({ example: 'cut' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'CUSTOMER callers always receive active services only, regardless of this filter.',
  })
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  isActive?: boolean;
}
