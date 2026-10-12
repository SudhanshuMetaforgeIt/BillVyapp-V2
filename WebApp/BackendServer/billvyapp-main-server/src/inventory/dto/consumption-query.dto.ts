import { IsOptional, IsUUID, Matches } from 'class-validator';
export class ConsumptionQueryDto {
  @IsOptional() @IsUUID() salonId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo: string;
}
