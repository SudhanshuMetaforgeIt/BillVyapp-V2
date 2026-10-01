import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLATFORM_REPORT_FORMATS,
  PLATFORM_REPORT_TYPES,
  type PlatformReportFormatApi,
  type PlatformReportTypeApi,
} from './generate-platform-report.dto';

export class PlatformReportResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: PLATFORM_REPORT_TYPES }) type: PlatformReportTypeApi;
  @ApiProperty() typeLabel: string;
  @ApiProperty({ enum: PLATFORM_REPORT_FORMATS })
  format: PlatformReportFormatApi;
  @ApiProperty({ example: '2026-09-01' }) dateFrom: string;
  @ApiProperty({ example: '2026-09-30' }) dateTo: string;
  @ApiProperty({ example: 'Sep 1, 2026 – Sep 30, 2026' })
  dateRangeLabel: string;
  @ApiPropertyOptional({ nullable: true }) franchiseId: string | null;
  @ApiPropertyOptional({ nullable: true }) franchiseName: string | null;
  @ApiProperty() generatedById: string;
  @ApiProperty() generatedBy: string;
  @ApiProperty() generatedOn: Date;
  @ApiProperty({ description: 'Live metrics snapshot captured at generation' })
  snapshot: Record<string, unknown>;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
