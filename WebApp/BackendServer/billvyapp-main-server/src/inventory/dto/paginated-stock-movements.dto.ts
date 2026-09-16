import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { StockMovementResponseDto } from './stock-movement-response.dto';

export class PaginatedStockMovementsDto {
  @ApiProperty({ type: [StockMovementResponseDto] })
  data: StockMovementResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
