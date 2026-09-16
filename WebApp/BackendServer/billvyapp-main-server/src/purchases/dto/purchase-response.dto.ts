import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseStatus } from '../../common/enums/purchase-status.enum';

export class PurchaseItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional({ description: 'Product name when included' })
  productName?: string;
  @ApiProperty() quantity: number;
  @ApiProperty({ example: '150.50' }) unitCost: string;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ example: '27.09' }) tax: string;
  @ApiProperty({ example: '1532.09' }) total: string;
}

export class PurchaseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() vendorId: string;
  @ApiProperty({ example: 'PO-1710000000000' }) purchaseNumber: string;
  @ApiPropertyOptional({ nullable: true }) vendorInvoiceNumber: string | null;
  @ApiProperty({ example: '2026-09-16' }) purchaseDate: string;
  @ApiProperty({ example: '1500.00' }) subtotal: string;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ example: '270.00' }) tax: string;
  @ApiProperty({ example: '1770.00' }) total: string;
  @ApiProperty({ enum: PurchaseStatus }) status: PurchaseStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty({ type: [PurchaseItemResponseDto] })
  items: PurchaseItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
