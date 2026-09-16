import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ example: 45 }) durationMinutes: number;
  @ApiProperty({ example: '799.00', description: 'Decimal(12,2) as a string' })
  price: string;
  @ApiProperty({ example: '18.00', description: 'Decimal(5,2) as a string' })
  taxRate: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
