import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NotificationChannel } from '../../common/enums/notification.enum';

export class CreateNotificationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: 'APPOINTMENT_REMINDER' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  notificationType: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Phone number or email address',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  recipient: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiProperty({ example: 'Your appointment is tomorrow at 10:00.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'ISO datetime to schedule delivery; omit for immediate queue',
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
