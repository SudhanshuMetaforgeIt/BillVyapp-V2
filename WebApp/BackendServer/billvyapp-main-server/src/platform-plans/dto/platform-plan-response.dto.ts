import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLATFORM_PLAN_BILLING_CYCLES,
  type PlatformPlanBillingCycleApi,
} from './create-platform-plan.dto';

export class PlatformPlanResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({
    nullable: true,
    example: '1199.00',
    description: 'Decimal(12,2) as a string; null for custom pricing',
  })
  priceMonthly: string | null;
  @ApiProperty({ enum: PLATFORM_PLAN_BILLING_CYCLES })
  billingCycle: PlatformPlanBillingCycleApi;
  @ApiProperty() isCustom: boolean;
  @ApiProperty() iconKey: string;
  @ApiPropertyOptional({ type: [String], nullable: true })
  features: string[] | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty({
    example: 0,
    description: 'Franchise subscriptions not linked yet; always 0 for now',
  })
  businessCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
