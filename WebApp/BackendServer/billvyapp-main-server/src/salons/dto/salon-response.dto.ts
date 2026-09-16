import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() franchiseId: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiProperty() addressLine1: string;
  @ApiPropertyOptional({ nullable: true }) addressLine2: string | null;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiProperty() country: string;
  @ApiProperty() postalCode: string;
  @ApiProperty({ example: '28.6328000' }) latitude: string;
  @ApiProperty({ example: '77.2197000' }) longitude: string;
  @ApiPropertyOptional({ nullable: true }) googlePlaceId: string | null;
  @ApiPropertyOptional({ nullable: true }) mapAddress: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
