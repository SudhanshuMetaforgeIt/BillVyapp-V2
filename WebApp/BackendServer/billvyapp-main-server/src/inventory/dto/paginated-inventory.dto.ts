import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { InventoryResponseDto } from './inventory-response.dto';

export class PaginatedInventoryDto {
  @ApiProperty({ type: [InventoryResponseDto] })
  data: InventoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
