import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export class ReportAnalyticsQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo: string;

  @IsOptional()
  @IsUUID()
  franchiseId?: string;

  @IsOptional()
  @IsUUID()
  salonId?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  interval?: 'day' | 'week' | 'month' | 'year';

  @IsOptional()
  @IsIn(['summary', 'revenue', 'business', 'insights', 'details'])
  section?: 'summary' | 'revenue' | 'business' | 'insights' | 'details';

  @IsOptional()
  @IsIn(['revenue', 'transactions', 'customers', 'averageBill'])
  salonSort?: 'revenue' | 'transactions' | 'customers' | 'averageBill';

  @IsOptional()
  @IsIn(['revenue', 'quantity', 'transactions'])
  serviceSort?: 'revenue' | 'quantity' | 'transactions';
}
