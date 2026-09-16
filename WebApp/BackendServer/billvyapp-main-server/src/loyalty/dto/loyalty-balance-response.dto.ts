import { ApiProperty } from '@nestjs/swagger';

export class LoyaltyBalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({
    example: 250,
    description: 'Sum of all loyalty transaction points for the customer',
  })
  balance: number;
}
