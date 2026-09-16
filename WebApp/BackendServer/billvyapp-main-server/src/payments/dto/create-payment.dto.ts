import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';

export const PAYMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  billId: string;

  @ApiProperty({ example: 500.0, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.UPI })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ nullable: true, maxLength: 191 })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  transactionReference?: string | null;

  @ApiPropertyOptional({
    example: '2099-08-25',
    description: 'Calendar date YYYY-MM-DD; defaults to now',
  })
  @IsOptional()
  @Matches(PAYMENT_DATE_PATTERN, {
    message: 'paymentDate must be YYYY-MM-DD',
  })
  paymentDate?: string;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    default: PaymentStatus.SUCCESS,
    description:
      'Defaults to SUCCESS. PENDING payments do not update bill paid amounts until marked SUCCESS.',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
