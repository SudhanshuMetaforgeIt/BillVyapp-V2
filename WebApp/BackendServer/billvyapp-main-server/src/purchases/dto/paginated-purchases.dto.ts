import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { PurchaseResponseDto } from './purchase-response.dto';

export class PaginatedPurchasesDto {
  @ApiProperty({ type: [PurchaseResponseDto] })
  data: PurchaseResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
