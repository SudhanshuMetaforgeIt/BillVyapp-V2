import { ApiProperty } from '@nestjs/swagger';
import { MembershipStatus } from '../../common/enums/membership-status.enum';

export class MembershipResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() customerId: string;
  @ApiProperty() membershipPlanId: string;
  @ApiProperty({ example: '2099-01-15' }) startDate: string;
  @ApiProperty({ example: '2100-01-15' }) endDate: string;
  @ApiProperty({ enum: MembershipStatus }) status: MembershipStatus;
  @ApiProperty({
    description: 'Salon that owns the membership plan',
  })
  salonId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ nullable: true }) couponCode: string | null;
  @ApiProperty({ nullable: true }) qualifyingBillId: string | null;
  @ApiProperty({ nullable: true, type: Object }) qualifyingBill: {
    id: string;
    billNumber: string;
  } | null;
  @ApiProperty({ nullable: true, type: Object }) planSnapshot: unknown;
  @ApiProperty() membershipName: string;
}
