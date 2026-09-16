import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { OptionalBooleanTransform } from '../../common/transformers/optional-boolean';

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'riya' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: true,
    description: 'Filters on the related User.isActive field',
  })
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'When set, only customers associated with this salon via appointments or bills are returned. Ignored for CUSTOMER callers.',
  })
  @IsOptional()
  @IsUUID()
  salonId?: string;
}
