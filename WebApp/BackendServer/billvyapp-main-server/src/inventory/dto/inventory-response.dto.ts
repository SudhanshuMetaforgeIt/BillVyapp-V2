import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional({ description: 'Product name when included' })
  productName?: string;
  @ApiPropertyOptional({ description: 'Product SKU when included' })
  productSku?: string;
  @ApiPropertyOptional({
    description: 'Product reorder level when included',
  })
  reorderLevel?: number;
  @ApiProperty() quantityOnHand: number;
  @ApiProperty() reservedQuantity: number;
  @ApiProperty() availableQuantity: number;
  @ApiProperty({ example: '120.50' }) averageCost: string;
  @ApiPropertyOptional({ nullable: true, example: '150.00' })
  lastPurchasePrice: string | null;
  @ApiPropertyOptional({ nullable: true }) lastStockedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
