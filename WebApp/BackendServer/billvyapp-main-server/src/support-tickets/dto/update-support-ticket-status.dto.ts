import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  SUPPORT_TICKET_STATUSES,
  type SupportTicketStatusApi,
} from './create-support-ticket.dto';

export class UpdateSupportTicketStatusDto {
  @ApiProperty({ enum: SUPPORT_TICKET_STATUSES, example: 'in_progress' })
  @IsIn(SUPPORT_TICKET_STATUSES)
  status: SupportTicketStatusApi;
}
