import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional({ nullable: true }) contactPerson: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) gstNumber: string | null;
  @ApiPropertyOptional({ nullable: true }) taxNumber: string | null;
  @ApiPropertyOptional({ nullable: true }) addressLine1: string | null;
  @ApiPropertyOptional({ nullable: true }) addressLine2: string | null;
  @ApiPropertyOptional({ nullable: true }) city: string | null;
  @ApiPropertyOptional({ nullable: true }) state: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode: string | null;
  @ApiPropertyOptional({
    example: '28.6328000',
    nullable: true,
    description: 'Decimal(10,7) as a string when present',
  })
  latitude: string | null;
  @ApiPropertyOptional({
    example: '77.2197000',
    nullable: true,
    description: 'Decimal(10,7) as a string when present',
  })
  longitude: string | null;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
