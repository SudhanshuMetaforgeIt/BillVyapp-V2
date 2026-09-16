import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MembershipStatus } from '../../common/enums/membership-status.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class MembershipQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filters memberships whose plan belongs to this salon',
  })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
