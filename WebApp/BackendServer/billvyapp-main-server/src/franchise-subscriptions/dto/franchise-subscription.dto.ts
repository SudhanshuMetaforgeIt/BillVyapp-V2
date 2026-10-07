import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  PLATFORM_PLAN_BILLING_CYCLES,
  type PlatformPlanBillingCycleApi,
} from '../../platform-plans/dto/create-platform-plan.dto';

export class EnrollFranchiseSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  franchiseId: string;

  @ApiProperty()
  @IsUUID()
  platformPlanId: string;

  @ApiProperty({ enum: PLATFORM_PLAN_BILLING_CYCLES, example: 'monthly' })
  @IsIn(PLATFORM_PLAN_BILLING_CYCLES)
  billingCycle: PlatformPlanBillingCycleApi;

  @ApiPropertyOptional({
    description:
      'Required for custom cycle; optional otherwise (defaults applied server-side).',
    example: '2026-09-30',
  })
  @ValidateIf((o: EnrollFranchiseSubscriptionDto) => o.billingCycle === 'custom')
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description:
      'Required for custom cycle; optional otherwise (defaults applied server-side).',
    example: '2027-09-30',
  })
  @ValidateIf((o: EnrollFranchiseSubscriptionDto) => o.billingCycle === 'custom')
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ListFranchiseSubscriptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  franchiseId?: string;
}

export class FranchiseSubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() franchiseId: string;
  @ApiProperty() franchiseName: string;
  @ApiProperty() platformPlanId: string;
  @ApiProperty() planName: string;
  @ApiProperty({ enum: PLATFORM_PLAN_BILLING_CYCLES })
  billingCycle: PlatformPlanBillingCycleApi;
  @ApiProperty({ enum: ['active', 'expired', 'cancelled'] })
  status: 'active' | 'expired' | 'cancelled';
  @ApiProperty() startsAt: string;
  @ApiProperty() endsAt: string;
  @ApiProperty() isCurrentlyActive: boolean;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedFranchiseSubscriptionsDto {
  @ApiProperty({ type: [FranchiseSubscriptionResponseDto] })
  data: FranchiseSubscriptionResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class RequestSubscriptionDto {
  @ApiPropertyOptional({ example: 'Please enroll our franchise on Pro yearly.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message?: string;
}
