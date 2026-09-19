import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillItemType,
  BillPaymentStatus,
  BillStatus,
} from '../../common/enums/bill-status.enum';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';

export class BillItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: BillItemType }) itemType: BillItemType;
  @ApiPropertyOptional({ nullable: true }) serviceId: string | null;
  @ApiPropertyOptional({ nullable: true }) productId: string | null;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty({ example: '799.00' }) unitPrice: string;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ example: '18.00' }) taxRate: string;
  @ApiProperty({ example: '143.82' }) taxAmount: string;
  @ApiProperty({ example: '942.82' }) total: string;
}

export class BillPaymentSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: '500.00' }) amount: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiProperty({ enum: PaymentStatus }) status: PaymentStatus;
  @ApiProperty() paymentDate: Date;
}

export class BillSalonDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}

export class BillCustomerDto {
  @ApiProperty() id: string;
  @ApiProperty() customerCode: string;
  @ApiPropertyOptional({ nullable: true }) firstName?: string | null;
  @ApiPropertyOptional({ nullable: true }) lastName?: string | null;
  @ApiPropertyOptional({ nullable: true }) phone?: string | null;
  @ApiPropertyOptional({ nullable: true }) email?: string | null;
}

export class BillResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() customerId: string;
  @ApiProperty({ example: 'BILL-1720000000000' }) billNumber: string;
  @ApiProperty({ example: '2099-08-25' }) billDate: string;
  @ApiProperty({ example: '799.00' }) subtotal: string;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ example: '143.82' }) tax: string;
  @ApiProperty({ example: '0.00' }) roundOff: string;
  @ApiProperty({ example: '942.82' }) total: string;
  @ApiProperty({ example: '0.00' }) paidAmount: string;
  @ApiProperty({ example: '942.82' }) dueAmount: string;
  @ApiProperty({ enum: BillStatus }) status: BillStatus;
  @ApiProperty({ enum: BillPaymentStatus }) paymentStatus: BillPaymentStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiPropertyOptional({ nullable: true }) createdBy: string | null;
  @ApiPropertyOptional({ type: BillSalonDto })
  salon?: BillSalonDto;
  @ApiPropertyOptional({ type: BillCustomerDto })
  customer?: BillCustomerDto;
  @ApiProperty({ type: [BillItemResponseDto] }) items: BillItemResponseDto[];
  @ApiPropertyOptional({ type: [BillPaymentSummaryDto] })
  payments?: BillPaymentSummaryDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
