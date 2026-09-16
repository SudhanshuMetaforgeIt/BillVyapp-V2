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
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PaginatedAppointmentsDto } from './dto/paginated-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentsService } from './appointments.service';

const APPOINTMENT_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

@ApiTags('Appointments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({
    summary: 'List appointments',
    description:
      'CUSTOMER callers only see their own appointments. Staff roles are limited to their franchise/salon scope. Supports salonId, customerId, staffId, status and date range filters.',
  })
  @ApiResponse({ status: 200, type: PaginatedAppointmentsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AppointmentQueryDto,
  ) {
    return this.appointmentsService.list(user, query);
  }

  @Post()
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({
    summary: 'Create an appointment',
    description:
      'Creates an appointment with one or more salon services. CUSTOMER identity is taken from the authenticated user. Duration is the sum of selected services. Conflicting staff slots return 409. Appointments are never physically deleted.',
  })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid salon, customer, service, time or cross-salon service',
  })
  @ApiResponse({
    status: 404,
    description: 'Salon, customer, service or staff not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Staff member already has an overlapping appointment',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
    @Req() req: Request,
  ) {
    return this.appointmentsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({
    summary: 'Get an appointment by id',
    description: 'A CUSTOMER may only read their own appointments.',
  })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 403, description: 'Appointment outside your scope' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({
    summary: 'Update an appointment',
    description:
      'Does not accept id, salonId, createdAt, updatedAt or status. A CUSTOMER may only update pending or confirmed appointments they own. Status is changed via PATCH /appointments/:id/status.',
  })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 403, description: 'Appointment outside your scope' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiResponse({
    status: 409,
    description: 'Staff member already has an overlapping appointment',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: Request,
  ) {
    return this.appointmentsService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({
    summary: 'Change appointment status',
    description:
      'Soft status change only. Allowed transitions are enforced. A CUSTOMER may only cancel a pending or confirmed appointment. Appointments are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  @ApiResponse({ status: 403, description: 'Appointment outside your scope' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: Request,
  ) {
    return this.appointmentsService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
