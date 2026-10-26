import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { StrictNumber } from '../../common/transformers/strict-number';
import { IsIndianMobileNumber } from '../../common/validators/indian-phone.decorator';
import {
  APPOINTMENT_DATE_PATTERN,
  APPOINTMENT_TIME_PATTERN,
} from './create-appointment.dto';

export class InstituteServiceItemDto {
  @ApiProperty() @IsUUID() serviceId: string;
}
export class CreateInstituteAppointmentDto {
  @ApiProperty() @IsUUID() salonId: string;
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,190}$/)
  idempotencyKey: string;
  @ApiProperty({ enum: [Gender.MALE, Gender.FEMALE] })
  @IsIn([Gender.MALE, Gender.FEMALE])
  studentGender: Gender;
  @ApiProperty()
  @StrictNumber()
  @IsInt()
  @Min(1)
  @Max(10000)
  studentCount: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) contactName: string;
  @IsIndianMobileNumber() contactPhone: string;
  @ApiProperty({ enum: ['Warden', 'Assistant manager'] })
  @IsIn(['Warden', 'Assistant manager'])
  contactRole: string;
  @ApiProperty() @Matches(APPOINTMENT_DATE_PATTERN) appointmentDate: string;
  @ApiProperty() @Matches(APPOINTMENT_TIME_PATTERN) startTime: string;
  @ApiProperty() @Matches(APPOINTMENT_TIME_PATTERN) endTime: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
  @ApiProperty({ type: [InstituteServiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => InstituteServiceItemDto)
  services: InstituteServiceItemDto[];
}
