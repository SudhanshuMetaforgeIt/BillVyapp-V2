import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { VendorResponseDto } from './vendor-response.dto';

export class PaginatedVendorsDto {
  @ApiProperty({ type: [VendorResponseDto] })
  data: VendorResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
