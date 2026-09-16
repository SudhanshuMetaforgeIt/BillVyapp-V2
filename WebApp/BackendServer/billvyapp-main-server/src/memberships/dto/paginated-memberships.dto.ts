import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { MembershipResponseDto } from './membership-response.dto';

export class PaginatedMembershipsDto {
  @ApiProperty({ type: [MembershipResponseDto] })
  data: MembershipResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
