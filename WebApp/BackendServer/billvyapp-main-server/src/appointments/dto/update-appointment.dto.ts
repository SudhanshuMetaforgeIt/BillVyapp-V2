import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import {
  AppointmentServiceItemDto,
  CreateAppointmentDto,
} from './create-appointment.dto';

/**
 * salonId is immutable after create. Appointments own historical relationships
 * (services, future bills) that must stay attached to the original salon.
 */
export class UpdateAppointmentDto extends PartialType(
  OmitType(CreateAppointmentDto, ['salonId', 'services'] as const),
) {
  @ApiPropertyOptional({ type: [AppointmentServiceItemDto], minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AppointmentServiceItemDto)
  services?: AppointmentServiceItemDto[];
}
