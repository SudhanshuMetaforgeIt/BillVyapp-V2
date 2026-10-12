import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { StrictNumber } from '../../common/transformers/strict-number';
export class LoyaltyProgramDto {
  @IsBoolean() enabled: boolean;
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  spendAmount: number;
  @StrictNumber() @IsInt() @Min(1) @Max(10000) pointsPerSpend: number;
  @StrictNumber() @IsInt() @Min(1) @Max(1_000_000) minimumRedeemPoints: number;
}
export class LoyaltyQuoteDto {
  @IsUUID() salonId: string;
  @IsUUID() customerId: string;
}
export class RedeemLoyaltyDto {
  @StrictNumber() @IsInt() @Min(1) @Max(1_000_000) points: number;
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,190}$/)
  idempotencyKey: string;
}
