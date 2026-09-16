import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '../../common/enums/stock-movement-type.enum';

export class StockMovementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional({ description: 'Product name when included' })
  productName?: string;
  @ApiProperty({ enum: StockMovementType }) movementType: StockMovementType;
  @ApiProperty({
    description: 'Signed quantity applied to on-hand stock',
  })
  quantity: number;
  @ApiPropertyOptional({ nullable: true }) referenceType: string | null;
  @ApiPropertyOptional({ nullable: true }) referenceId: string | null;
  @ApiPropertyOptional({ nullable: true, example: '150.00' })
  unitCost: string | null;
  @ApiProperty() balanceAfter: number;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiPropertyOptional({ nullable: true }) createdBy: string | null;
  @ApiProperty() createdAt: Date;
}
