import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';

export class ProductVendorResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() vendorId: string;
  @ApiPropertyOptional({ nullable: true }) vendorProductCode: string | null;
  @ApiPropertyOptional({
    example: '120.50',
    nullable: true,
    description: 'Decimal(12,2) as a string when present',
  })
  purchasePrice: string | null;
  @ApiProperty() isPreferred: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedProductVendorsDto {
  @ApiProperty({ type: [ProductVendorResponseDto] })
  data: ProductVendorResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
