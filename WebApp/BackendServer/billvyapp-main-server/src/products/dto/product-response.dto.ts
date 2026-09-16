import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() name: string;
  @ApiProperty() sku: string;
  @ApiPropertyOptional({ nullable: true }) barcode: string | null;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ example: 'PCS' }) unit: string;
  @ApiProperty({
    example: '250.00',
    description: 'Decimal(12,2) as a string',
  })
  costPrice: string;
  @ApiProperty({
    example: '499.00',
    description: 'Decimal(12,2) as a string',
  })
  sellingPrice: string;
  @ApiProperty({ example: '18.00', description: 'Decimal(5,2) as a string' })
  taxRate: string;
  @ApiProperty({ example: 5 }) reorderLevel: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
