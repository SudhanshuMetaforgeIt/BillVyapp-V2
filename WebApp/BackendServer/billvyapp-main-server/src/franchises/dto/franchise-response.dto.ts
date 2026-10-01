import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FranchiseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Franchise UI preferences JSON',
  })
  preferences?: unknown;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Active or latest platform plan name',
  })
  currentPlanName?: string | null;
  @ApiPropertyOptional({
    nullable: true,
    enum: ['active', 'expired', 'cancelled'],
  })
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | null;
  @ApiPropertyOptional({ nullable: true, example: '2026-09-30' })
  subscriptionStartsAt?: string | null;
  @ApiPropertyOptional({ nullable: true, example: '2027-09-30' })
  subscriptionEndsAt?: string | null;
  @ApiPropertyOptional({
    description: 'True when status is ACTIVE and covers today',
  })
  subscriptionActive?: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
