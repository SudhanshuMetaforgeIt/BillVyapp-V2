import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const SUPPORT_TICKET_CATEGORIES = [
  'billing',
  'payments',
  'account',
  'feature_request',
  'subscription',
  'reports',
] as const;

export type SupportTicketCategoryApi =
  (typeof SUPPORT_TICKET_CATEGORIES)[number];

export const SUPPORT_TICKET_PRIORITIES = ['high', 'medium', 'low'] as const;

export type SupportTicketPriorityApi =
  (typeof SUPPORT_TICKET_PRIORITIES)[number];

export const SUPPORT_TICKET_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const;

export type SupportTicketStatusApi = (typeof SUPPORT_TICKET_STATUSES)[number];

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Unable to generate invoice PDF' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  subject: string;

  @ApiProperty({ example: 'When I click download on a completed bill…' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ enum: SUPPORT_TICKET_CATEGORIES, example: 'billing' })
  @IsIn(SUPPORT_TICKET_CATEGORIES)
  category: SupportTicketCategoryApi;

  @ApiPropertyOptional({
    enum: SUPPORT_TICKET_PRIORITIES,
    example: 'medium',
    description: 'Defaults to medium when omitted',
  })
  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES)
  priority?: SupportTicketPriorityApi;
}
