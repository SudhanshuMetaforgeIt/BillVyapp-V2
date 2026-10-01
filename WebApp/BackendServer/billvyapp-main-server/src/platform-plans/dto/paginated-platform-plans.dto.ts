import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { PlatformPlanResponseDto } from './platform-plan-response.dto';

export class PaginatedPlatformPlansDto {
  @ApiProperty({ type: [PlatformPlanResponseDto] })
  data: PlatformPlanResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
