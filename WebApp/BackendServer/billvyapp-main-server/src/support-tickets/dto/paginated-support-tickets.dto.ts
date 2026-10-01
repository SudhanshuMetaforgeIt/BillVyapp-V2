import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_STATUSES,
} from './create-support-ticket.dto';
import { SupportTicketResponseDto } from './support-ticket-response.dto';

export class SupportTicketStatusCountDto {
  @ApiProperty({ enum: SUPPORT_TICKET_STATUSES })
  status: string;

  @ApiProperty()
  count: number;
}

export class SupportTicketCategoryCountDto {
  @ApiProperty({ enum: SUPPORT_TICKET_CATEGORIES })
  category: string;

  @ApiProperty()
  count: number;
}

export class SupportTicketsSummaryDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: [SupportTicketStatusCountDto] })
  byStatus: SupportTicketStatusCountDto[];

  @ApiProperty({ type: [SupportTicketCategoryCountDto] })
  byCategory: SupportTicketCategoryCountDto[];
}

export class PaginatedSupportTicketsDto {
  @ApiProperty({ type: [SupportTicketResponseDto] })
  data: SupportTicketResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ type: SupportTicketsSummaryDto })
  summary: SupportTicketsSummaryDto;
}
