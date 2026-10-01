import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { PaginatedSupportTicketsDto } from './dto/paginated-support-tickets.dto';
import { SupportTicketResponseDto } from './dto/support-ticket-response.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { SupportTicketsService } from './support-tickets.service';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Get()
  @ApiOperation({
    summary: 'List support tickets',
    description:
      'Super Admin sees all tickets. Admin/Manager see tickets for their franchise.',
  })
  @ApiResponse({ status: 200, type: PaginatedSupportTicketsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSupportTicketsQueryDto,
  ) {
    return this.supportTicketsService.list(user, query);
  }

  @Post()
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER)
  @ApiOperation({
    summary: 'Raise a support ticket',
    description: 'Admin and Manager only. Tickets appear for Super Admin.',
  })
  @ApiResponse({ status: 201, type: SupportTicketResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportTicketDto,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a support ticket by id' })
  @ApiResponse({ status: 200, type: SupportTicketResponseDto })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.supportTicketsService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(RoleCode.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update support ticket status',
    description: 'Super Admin only',
  })
  @ApiResponse({ status: 200, type: SupportTicketResponseDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportTicketStatusDto,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
