import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketCategoryApi,
  type SupportTicketPriorityApi,
  type SupportTicketStatusApi,
} from './create-support-ticket.dto';

export class ListSupportTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'invoice' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @ApiPropertyOptional({ enum: SUPPORT_TICKET_STATUSES })
  @IsOptional()
  @IsIn(SUPPORT_TICKET_STATUSES)
  status?: SupportTicketStatusApi;

  @ApiPropertyOptional({ enum: SUPPORT_TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES)
  priority?: SupportTicketPriorityApi;

  @ApiPropertyOptional({ enum: SUPPORT_TICKET_CATEGORIES })
  @IsOptional()
  @IsIn(SUPPORT_TICKET_CATEGORIES)
  category?: SupportTicketCategoryApi;

  @ApiPropertyOptional({
    description: 'Filter by createdAt lower bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by createdAt upper bound (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;
}
