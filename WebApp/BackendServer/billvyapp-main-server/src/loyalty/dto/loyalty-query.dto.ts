import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LoyaltyTransactionType } from '../../common/enums/loyalty-transaction-type.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class LoyaltyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ enum: LoyaltyTransactionType })
  @IsOptional()
  @IsEnum(LoyaltyTransactionType)
  transactionType?: LoyaltyTransactionType;
}
