import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BillStatus } from '../../common/enums/bill-status.enum';

export class UpdateBillStatusDto {
  @ApiProperty({
    enum: BillStatus,
    example: BillStatus.COMPLETED,
    description:
      'DRAFT→COMPLETED|CANCELLED; COMPLETED→REFUNDED|CANCELLED (CANCELLED blocked when paidAmount > 0)',
  })
  @IsEnum(BillStatus)
  status: BillStatus;
}
