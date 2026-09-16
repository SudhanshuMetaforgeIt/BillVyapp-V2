import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PurchaseStatus } from '../../common/enums/purchase-status.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { PURCHASE_DATE_PATTERN } from './create-purchase.dto';

export class PurchaseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Inclusive purchaseDate lower bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(PURCHASE_DATE_PATTERN, {
    message: 'dateFrom must be YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Inclusive purchaseDate upper bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(PURCHASE_DATE_PATTERN, {
    message: 'dateTo must be YYYY-MM-DD',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    example: 'PO-171',
    description: 'Matches purchaseNumber (contains)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
