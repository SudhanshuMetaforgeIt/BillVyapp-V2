import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { BillResponseDto } from './bill-response.dto';

export class PaginatedBillsDto {
  @ApiProperty({ type: [BillResponseDto] })
  data: BillResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
