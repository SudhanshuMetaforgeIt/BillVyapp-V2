import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  Equals,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BillItemType } from '../../common/enums/bill-status.enum';

export const BILL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateBillItemDto {
  @ApiProperty({ enum: BillItemType })
  @IsEnum(BillItemType)
  itemType: BillItemType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when itemType is SERVICE',
  })
  @ValidateIf((o: CreateBillItemDto) => o.itemType === BillItemType.SERVICE)
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when itemType is PRODUCT',
  })
  @ValidateIf((o: CreateBillItemDto) => o.itemType === BillItemType.PRODUCT)
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 799.0,
    minimum: 0,
    description:
      'Snapshot from Service.price / Product.sellingPrice when omitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 18,
    minimum: 0,
    maximum: 100,
    description: 'Snapshot from catalog taxRate when omitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class BillEnrollmentDetailsDto {
  @ApiProperty() @Equals(true) nameConfirmed: boolean;
  @ApiProperty() @IsBoolean() whatsappSameAsBilling: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/)
  whatsappNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(BILL_DATE_PATTERN)
  dateOfBirth?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;
}

export class CreateBillDto {
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  enrollmentPlanId?: string | null;
  @ApiPropertyOptional({ type: BillEnrollmentDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillEnrollmentDetailsDto)
  enrollmentDetails?: BillEnrollmentDetailsDto;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Customer membership coupon; eligible lines receive the configured membership benefit',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/)
  couponCode?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required for staff/admin callers. Ignored for CUSTOMER callers — identity is taken from the authenticated user.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'BILL-1720000000000',
    description: 'Defaults to BILL-{Date.now()} when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  billNumber?: string;

  @ApiPropertyOptional({
    example: '2099-08-25',
    description: 'Calendar date YYYY-MM-DD; defaults to today (UTC)',
  })
  @IsOptional()
  @Matches(BILL_DATE_PATTERN, {
    message: 'billDate must be YYYY-MM-DD',
  })
  billDate?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: 'Bill-level tax; defaults to sum of line taxAmounts',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  roundOff?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ type: [CreateBillItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items: CreateBillItemDto[];
}
