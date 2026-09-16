import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationStatus,
} from '../../common/enums/notification.enum';

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) salonId: string | null;
  @ApiPropertyOptional({ nullable: true }) userId: string | null;
  @ApiPropertyOptional({ nullable: true }) customerId: string | null;
  @ApiProperty({ enum: NotificationChannel }) channel: NotificationChannel;
  @ApiProperty() notificationType: string;
  @ApiProperty() recipient: string;
  @ApiPropertyOptional({ nullable: true }) subject: string | null;
  @ApiProperty() message: string;
  @ApiProperty({ enum: NotificationStatus }) status: NotificationStatus;
  @ApiPropertyOptional({ nullable: true }) provider: string | null;
  @ApiPropertyOptional({ nullable: true }) providerReference: string | null;
  @ApiPropertyOptional({ nullable: true }) errorMessage: string | null;
  @ApiProperty() retryCount: number;
  @ApiPropertyOptional({ nullable: true }) scheduledAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) sentAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) deliveredAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) failedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
