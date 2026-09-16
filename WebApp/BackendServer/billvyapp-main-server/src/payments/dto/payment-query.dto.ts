import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { PAYMENT_DATE_PATTERN } from './create-payment.dto';

export class PaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  billId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: '2099-08-01',
    description: 'Inclusive paymentDate lower bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(PAYMENT_DATE_PATTERN, {
    message: 'dateFrom must be YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2099-08-31',
    description: 'Inclusive paymentDate upper bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(PAYMENT_DATE_PATTERN, {
    message: 'dateTo must be YYYY-MM-DD',
  })
  dateTo?: string;
}
