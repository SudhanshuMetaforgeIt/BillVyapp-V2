import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { ServiceCategoryResponseDto } from './service-category-response.dto';

export class PaginatedServiceCategoriesDto {
  @ApiProperty({ type: [ServiceCategoryResponseDto] })
  data: ServiceCategoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
