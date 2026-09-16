import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyTransactionType } from '../../common/enums/loyalty-transaction-type.enum';

export class LoyaltyTransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() customerId: string;
  @ApiPropertyOptional({ nullable: true }) salonId: string | null;
  @ApiProperty({ example: 100 }) points: number;
  @ApiProperty({ enum: LoyaltyTransactionType })
  transactionType: LoyaltyTransactionType;
  @ApiPropertyOptional({ nullable: true }) referenceType: string | null;
  @ApiPropertyOptional({ nullable: true }) referenceId: string | null;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: Date;
}
