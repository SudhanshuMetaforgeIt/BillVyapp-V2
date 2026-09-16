import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { MediaFileResponseDto } from './media-response.dto';

export class PaginatedMediaDto {
  @ApiProperty({ type: [MediaFileResponseDto] })
  data: MediaFileResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
