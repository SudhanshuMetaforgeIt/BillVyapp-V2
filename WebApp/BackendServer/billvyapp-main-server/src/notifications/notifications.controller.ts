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
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { NotificationsService } from './notifications.service';

const READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary: 'List notifications',
    description:
      'CUSTOMER callers only see their own notifications. Staff roles are limited by salon/franchise scope.',
  })
  @ApiResponse({ status: 200, type: PaginatedNotificationsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.list(user, query);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Create and enqueue a notification',
    description:
      'Persists the outbound message log row and enqueues a BullMQ job on Redis. Provider delivery is handled asynchronously.',
  })
  @ApiResponse({ status: 201, type: NotificationResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationDto,
    @Req() req: Request,
  ) {
    return this.notificationsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a notification by id' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Update notification delivery status',
    description:
      'Enforces allowed status transitions from the notification state machine.',
  })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationStatusDto,
    @Req() req: Request,
  ) {
    return this.notificationsService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
