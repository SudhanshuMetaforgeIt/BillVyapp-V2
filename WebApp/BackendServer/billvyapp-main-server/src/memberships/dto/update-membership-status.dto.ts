import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MembershipStatus } from '../../common/enums/membership-status.enum';

export class UpdateMembershipStatusDto {
  @ApiProperty({
    enum: MembershipStatus,
    example: MembershipStatus.ACTIVE,
  })
  @IsEnum(MembershipStatus)
  status: MembershipStatus;
}
