import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { PLATFORM_REPORT_TYPES } from './generate-platform-report.dto';
import { PlatformReportResponseDto } from './platform-report-response.dto';

export class PlatformReportTypeCountDto {
  @ApiProperty({ enum: PLATFORM_REPORT_TYPES })
  type: string;

  @ApiProperty()
  count: number;
}

export class PlatformReportsSummaryDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: [PlatformReportTypeCountDto] })
  byType: PlatformReportTypeCountDto[];
}

export class PaginatedPlatformReportsDto {
  @ApiProperty({ type: [PlatformReportResponseDto] })
  data: PlatformReportResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ type: PlatformReportsSummaryDto })
  summary: PlatformReportsSummaryDto;
}
