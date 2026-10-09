import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  IsDateString,
  Matches,
} from 'class-validator';

export class AdminReportQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsIn(['overview'])
  reportType?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  interval?: 'day' | 'week' | 'month';

  @IsOptional()
  @IsBoolean()
  async?: boolean;
}
