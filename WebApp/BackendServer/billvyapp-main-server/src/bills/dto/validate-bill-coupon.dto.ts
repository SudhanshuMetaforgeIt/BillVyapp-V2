import { Transform } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { CreateBillDto } from './create-bill.dto';

export class ValidateBillCouponDto extends PickType(CreateBillDto, [
  'salonId',
] as const) {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/)
  couponCode: string;
}

export class ValidatedBillCouponDto {
  @ApiProperty({ default: false }) freeServicesPerVisit: boolean;
  @ApiProperty({ nullable: true }) couponUsageLimit: number | null;
  @ApiProperty() usedVisits: number;
  @ApiProperty({ nullable: true }) remainingVisits: number | null;
  @ApiProperty({ nullable: true }) termsAndConditions: string | null;

  @ApiProperty() benefitType: string;
  @ApiProperty({ nullable: true }) discountPercentage: number | null;
  @ApiProperty({ nullable: true }) freeServiceLimit: number | null;
  @ApiProperty() usedUnits: number;
  @ApiProperty({ nullable: true }) remainingUnits: number | null;

  @ApiProperty() couponCode: string;
  @ApiProperty() membershipName: string;
  @ApiProperty() startDate: string;
  @ApiProperty() endDate: string;
  @ApiProperty({ nullable: true }) benefits: string | null;
  @ApiProperty({ type: [Object] }) eligibleServices: {
    id: string;
    name: string;
  }[];
}
