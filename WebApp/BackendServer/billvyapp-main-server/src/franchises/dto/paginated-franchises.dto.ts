import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { FranchiseResponseDto } from './franchise-response.dto';

export class PaginatedFranchisesDto {
  @ApiProperty({ type: [FranchiseResponseDto] })
  data: FranchiseResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
