import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressType } from '../../common/enums/address-type.enum';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';

export class CustomerAddressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() customerId: string;
  @ApiProperty({ enum: AddressType }) addressType: AddressType;
  @ApiProperty() addressLine1: string;
  @ApiPropertyOptional({ nullable: true }) addressLine2: string | null;
  @ApiPropertyOptional({ nullable: true }) city: string | null;
  @ApiPropertyOptional({ nullable: true }) state: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode: string | null;
  @ApiPropertyOptional({
    example: '12.9716000',
    nullable: true,
    description: 'Decimal(10,7) as a string when present',
  })
  latitude: string | null;
  @ApiPropertyOptional({
    example: '77.5946000',
    nullable: true,
    description: 'Decimal(10,7) as a string when present',
  })
  longitude: string | null;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedCustomerAddressesDto {
  @ApiProperty({ type: [CustomerAddressResponseDto] })
  data: CustomerAddressResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
