import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PurchaseStatus } from '../../common/enums/purchase-status.enum';

export class UpdatePurchaseStatusDto {
  @ApiProperty({
    enum: PurchaseStatus,
    example: PurchaseStatus.ORDERED,
  })
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;
}
