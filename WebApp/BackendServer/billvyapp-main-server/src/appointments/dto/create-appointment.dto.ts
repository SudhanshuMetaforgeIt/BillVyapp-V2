import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const APPOINTMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const APPOINTMENT_TIME_PATTERN =
  /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class AppointmentServiceItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Optional staff for this line. Null means any available / salon-assigned later.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  staffId?: string | null;
}

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salonId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required for staff/admin callers. Ignored for CUSTOMER callers — identity is taken from the authenticated user.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Nullable: a customer may book any available staff and the salon assigns later.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  staffId?: string | null;

  @ApiProperty({
    example: '2099-08-25',
    description: 'Calendar date YYYY-MM-DD',
  })
  @Matches(APPOINTMENT_DATE_PATTERN, {
    message: 'appointmentDate must be YYYY-MM-DD',
  })
  appointmentDate: string;

  @ApiProperty({
    example: '10:30',
    description: 'Start time HH:mm or HH:mm:ss',
  })
  @Matches(APPOINTMENT_TIME_PATTERN, {
    message: 'startTime must be HH:mm or HH:mm:ss',
  })
  startTime: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ type: [AppointmentServiceItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AppointmentServiceItemDto)
  services: AppointmentServiceItemDto[];
}
