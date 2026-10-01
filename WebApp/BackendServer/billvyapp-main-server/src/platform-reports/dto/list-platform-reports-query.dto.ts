import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  PLATFORM_REPORT_TYPES,
  type PlatformReportTypeApi,
} from './generate-platform-report.dto';

export class ListPlatformReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'financial' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ enum: PLATFORM_REPORT_TYPES })
  @IsOptional()
  @IsIn(PLATFORM_REPORT_TYPES)
  type?: PlatformReportTypeApi;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  franchiseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by report createdAt lower bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by report createdAt upper bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;
}
