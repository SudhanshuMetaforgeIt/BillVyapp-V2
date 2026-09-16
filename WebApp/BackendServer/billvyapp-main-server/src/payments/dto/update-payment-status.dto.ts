import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment.enum';

export class UpdatePaymentStatusDto {
  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.REFUNDED,
    description:
      'PENDING→SUCCESS|FAILED|CANCELLED|REFUNDED; SUCCESS→FAILED|CANCELLED|REFUNDED. SUCCESS transitions recalculate bill paid/due amounts.',
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
