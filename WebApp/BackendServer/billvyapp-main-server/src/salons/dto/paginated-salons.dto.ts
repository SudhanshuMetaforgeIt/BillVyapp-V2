import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { SalonResponseDto } from './salon-response.dto';

export class PaginatedSalonsDto {
  @ApiProperty({ type: [SalonResponseDto] })
  data: SalonResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
