import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { ServiceResponseDto } from './service-response.dto';

export class PaginatedServicesDto {
  @ApiProperty({ type: [ServiceResponseDto] })
  data: ServiceResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
