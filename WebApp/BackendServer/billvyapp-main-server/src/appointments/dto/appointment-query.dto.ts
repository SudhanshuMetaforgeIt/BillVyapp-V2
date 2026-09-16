import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { APPOINTMENT_DATE_PATTERN } from './create-appointment.dto';

export class AppointmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    example: '2099-08-01',
    description: 'Inclusive appointmentDate lower bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(APPOINTMENT_DATE_PATTERN, {
    message: 'dateFrom must be YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2099-08-31',
    description: 'Inclusive appointmentDate upper bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(APPOINTMENT_DATE_PATTERN, {
    message: 'dateTo must be YYYY-MM-DD',
  })
  dateTo?: string;
}
