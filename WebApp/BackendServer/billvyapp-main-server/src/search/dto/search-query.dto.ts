import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export const SEARCH_TYPES = [
  'customers',
  'bills',
  'appointments',
  'services',
  'products',
  'salons',
] as const;

export type SearchEntityType = (typeof SEARCH_TYPES)[number];

export class SearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'riya',
    description: 'Search text (min 1 character when provided)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    example: 'customers,bills',
    description:
      'Comma-separated entity types. Allowed: customers,bills,appointments,services,products,salons',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(100)
  @Matches(
    /^(customers|bills|appointments|services|products|salons)(\s*,\s*(customers|bills|appointments|services|products|salons))*$/,
  )
  types?: string;
}
