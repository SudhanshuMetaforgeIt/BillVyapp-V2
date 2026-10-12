import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoyaltyWalletResponseDto {
  @ApiProperty() franchiseId: string;
  @ApiProperty() franchiseName: string;
  @ApiProperty() balance: number;
  @ApiProperty({ enum: ['INR', 'USD'] }) currency: string;
  @ApiProperty() minimumRedeemPoints: number;
  @ApiProperty() enabled: boolean;
}

export class LoyaltyBalanceResponseDto {
  @ApiPropertyOptional({ type: [LoyaltyWalletResponseDto] })
  wallets?: LoyaltyWalletResponseDto[];
  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({
    example: 250,
    description: 'Sum of all loyalty transaction points for the customer',
  })
  balance: number;
}
