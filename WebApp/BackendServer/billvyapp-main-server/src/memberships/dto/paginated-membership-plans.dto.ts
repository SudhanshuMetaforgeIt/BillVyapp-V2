import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { MembershipPlanResponseDto } from './membership-plan-response.dto';

export class PaginatedMembershipPlansDto {
  @ApiProperty({ type: [MembershipPlanResponseDto] })
  data: MembershipPlanResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
