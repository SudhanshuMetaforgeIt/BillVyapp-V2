import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { ProductCategoryResponseDto } from './product-category-response.dto';

export class PaginatedProductCategoriesDto {
  @ApiProperty({ type: [ProductCategoryResponseDto] })
  data: ProductCategoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
