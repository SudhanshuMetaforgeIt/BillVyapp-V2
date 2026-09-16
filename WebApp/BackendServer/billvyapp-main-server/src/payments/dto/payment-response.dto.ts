import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() billId: string;
  @ApiProperty({ example: '500.00' }) amount: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiPropertyOptional({ nullable: true }) transactionReference: string | null;
  @ApiProperty() paymentDate: Date;
  @ApiProperty({ enum: PaymentStatus }) status: PaymentStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiPropertyOptional({
    description: 'Salon of the parent bill (for scope visibility)',
  })
  salonId?: string;
  @ApiPropertyOptional({
    description: 'Customer of the parent bill',
  })
  customerId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
