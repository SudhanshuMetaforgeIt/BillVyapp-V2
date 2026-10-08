import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpensePaymentMethod } from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { OptionalBooleanTransform } from '../../common/transformers/optional-boolean';

export class CreateExpenseDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Validated against the branch; derived when omitted.',
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Manager defaults to their assigned branch; required for Admin.',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId: string;
  @ApiProperty({ example: 25000, minimum: 0.01, maximum: 9999999999.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  amount: number;
  @ApiProperty({
    example: '2026-10-08',
    description: 'Calendar date YYYY-MM-DD.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expenseDate: string;
  @ApiProperty({ enum: ExpensePaymentMethod })
  @IsEnum(ExpensePaymentMethod)
  paymentMethod: ExpensePaymentMethod;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  vendorName?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description:
      'HTTP(S) URL or storage path for a PDF, JPG, JPEG, or PNG. No upload is performed.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  receiptUrl?: string | null;
}

export class UpdateExpenseDto extends PartialType(
  OmitType(CreateExpenseDto, ['businessId', 'branchId'] as const),
  { skipNullProperties: false },
) {}

export class ExpenseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  businessId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;
  @ApiPropertyOptional({ enum: ExpensePaymentMethod })
  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;
  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;
}

export class CreateExpenseCategoryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Defaults to the Admin’s business and must match their scope.',
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'name must not be blank' })
  @MaxLength(191)
  name: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;
}

export class UpdateExpenseCategoryDto extends PartialType(
  OmitType(CreateExpenseCategoryDto, [
    'businessId',
    'parentId',
    'description',
  ] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;
}

export class ExpenseCategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  businessId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
  @ApiPropertyOptional({
    description: 'When true, return top-level categories only.',
  })
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  rootsOnly?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @OptionalBooleanTransform()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;
}
