import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

export class AppointmentServiceLineDto {
  @ApiProperty() id: string;
  @ApiProperty() serviceId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) staffId: string | null;
  @ApiProperty({ example: '799.00' }) price: string;
  @ApiProperty() durationMinutes: number;
  @ApiProperty({ enum: AppointmentStatus }) status: AppointmentStatus;
}

export class AppointmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() customerId: string;
  @ApiPropertyOptional({ nullable: true }) staffId: string | null;
  @ApiProperty({ example: 'APT-A1B2C3D4' }) appointmentNumber: string;
  @ApiProperty({ example: '2099-08-25' }) appointmentDate: string;
  @ApiProperty({ example: '10:30:00' }) startTime: string;
  @ApiProperty({ example: '11:15:00' }) endTime: string;
  @ApiProperty() totalDurationMinutes: number;
  @ApiProperty({ enum: AppointmentStatus }) status: AppointmentStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty({ type: [AppointmentServiceLineDto] })
  services: AppointmentServiceLineDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
