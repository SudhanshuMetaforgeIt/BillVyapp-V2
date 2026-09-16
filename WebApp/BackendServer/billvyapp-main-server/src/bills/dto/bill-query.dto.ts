import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  BillPaymentStatus,
  BillStatus,
} from '../../common/enums/bill-status.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { BILL_DATE_PATTERN } from './create-bill.dto';

export class BillQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({ enum: BillPaymentStatus })
  @IsOptional()
  @IsEnum(BillPaymentStatus)
  paymentStatus?: BillPaymentStatus;

  @ApiPropertyOptional({
    example: '2099-08-01',
    description: 'Inclusive billDate lower bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(BILL_DATE_PATTERN, {
    message: 'dateFrom must be YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2099-08-31',
    description: 'Inclusive billDate upper bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(BILL_DATE_PATTERN, {
    message: 'dateTo must be YYYY-MM-DD',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    example: 'BILL-172',
    description: 'Case-insensitive contains match on billNumber',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
