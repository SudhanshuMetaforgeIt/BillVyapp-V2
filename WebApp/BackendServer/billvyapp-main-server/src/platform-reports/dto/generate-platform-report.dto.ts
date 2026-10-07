import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export const PLATFORM_REPORT_TYPES = [
  'financial',
  'business',
  'user',
  'transaction',
  'subscription',
  'activity',
] as const;

export type PlatformReportTypeApi = (typeof PLATFORM_REPORT_TYPES)[number];

export const PLATFORM_REPORT_FORMATS = ['pdf', 'excel'] as const;

export type PlatformReportFormatApi = (typeof PLATFORM_REPORT_FORMATS)[number];

export class GeneratePlatformReportDto {
  @ApiProperty({ enum: PLATFORM_REPORT_TYPES, example: 'financial' })
  @IsIn(PLATFORM_REPORT_TYPES)
  type: PlatformReportTypeApi;

  @ApiPropertyOptional({
    enum: PLATFORM_REPORT_FORMATS,
    example: 'excel',
    description:
      'Excel-compatible CSV. Legacy PDF snapshots still download as CSV.',
  })
  @IsOptional()
  @IsIn(PLATFORM_REPORT_FORMATS)
  format?: PlatformReportFormatApi;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Inclusive range start (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom: string;

  @ApiProperty({
    example: '2026-09-30',
    description: 'Inclusive range end (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo: string;

  @ApiPropertyOptional({
    description: 'Optional franchise scope for the snapshot',
  })
  @IsOptional()
  @IsUUID()
  franchiseId?: string;

  @ApiPropertyOptional({ description: 'Optional salon scope' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month', 'year'] })
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  interval?: 'day' | 'week' | 'month' | 'year';
  @ApiPropertyOptional({
    enum: ['revenue', 'transactions', 'customers', 'averageBill'],
  })
  @IsOptional()
  @IsIn(['revenue', 'transactions', 'customers', 'averageBill'])
  salonSort?: 'revenue' | 'transactions' | 'customers' | 'averageBill';

  @ApiPropertyOptional({ enum: ['revenue', 'quantity', 'transactions'] })
  @IsOptional()
  @IsIn(['revenue', 'quantity', 'transactions'])
  serviceSort?: 'revenue' | 'quantity' | 'transactions';

  @ApiPropertyOptional({
    description: 'Whether to enqueue report generation to background queue',
    example: true,
  })
  @IsOptional()
  async?: boolean;
}
