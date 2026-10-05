import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MembershipPlanResponseDto {
  @ApiProperty({ default: false }) freeServicesPerVisit: boolean;

  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ example: '4999.00', description: 'Decimal(12,2) as a string' })
  price: string;
  @ApiProperty({ example: 365 }) durationDays: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) benefits: string | null;
  @ApiPropertyOptional({ nullable: true }) enrollmentThreshold: string | null;
  @ApiPropertyOptional({ nullable: true }) couponPrefix: string | null;
  @ApiProperty({ type: [Object] }) eligibleServices: {
    id: string;
    name: string;
  }[];
  @ApiProperty() salonName: string;
}
