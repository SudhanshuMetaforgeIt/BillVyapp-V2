import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { LoyaltyTransactionResponseDto } from './loyalty-transaction-response.dto';

export class PaginatedLoyaltyTransactionsDto {
  @ApiProperty({ type: [LoyaltyTransactionResponseDto] })
  data: LoyaltyTransactionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
