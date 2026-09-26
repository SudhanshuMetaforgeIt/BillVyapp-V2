import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';

export class SearchHitDto {
  @ApiProperty({
    example: 'customers',
    enum: [
      'customers',
      'bills',
      'appointments',
      'services',
      'products',
      'salons',
    ],
  })
  type: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  subtitle?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Type-specific lightweight metadata',
  })
  meta?: Record<string, unknown> | null;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchHitDto] })
  data: SearchHitDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
