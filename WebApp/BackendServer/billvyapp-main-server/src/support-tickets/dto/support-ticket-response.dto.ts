import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketCategoryApi,
  type SupportTicketPriorityApi,
  type SupportTicketStatusApi,
} from './create-support-ticket.dto';

export class SupportTicketResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'TKT-00001' }) displayId: string;
  @ApiProperty() subject: string;
  @ApiProperty() description: string;
  @ApiProperty() preview: string;
  @ApiProperty({ enum: SUPPORT_TICKET_CATEGORIES })
  category: SupportTicketCategoryApi;
  @ApiProperty() categoryLabel: string;
  @ApiProperty({ enum: SUPPORT_TICKET_PRIORITIES })
  priority: SupportTicketPriorityApi;
  @ApiProperty() priorityLabel: string;
  @ApiProperty({ enum: SUPPORT_TICKET_STATUSES })
  status: SupportTicketStatusApi;
  @ApiProperty() statusLabel: string;
  @ApiProperty() customerName: string;
  @ApiProperty() businessName: string;
  @ApiPropertyOptional({ nullable: true }) franchiseId: string | null;
  @ApiPropertyOptional({ nullable: true }) salonId: string | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
