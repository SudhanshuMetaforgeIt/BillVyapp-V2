import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductCategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
