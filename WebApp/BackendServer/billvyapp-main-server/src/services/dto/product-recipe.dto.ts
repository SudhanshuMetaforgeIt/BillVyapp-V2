import { IsEnum, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { StrictNumber } from '../../common/transformers/strict-number';
export class ProductRecipeDto {
  @IsUUID() productId: string;
  @IsEnum({ PERCENT: 'PERCENT', FIXED: 'FIXED' }) mode: 'PERCENT' | 'FIXED';
  @StrictNumber()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1000000)
  value: number;
}
