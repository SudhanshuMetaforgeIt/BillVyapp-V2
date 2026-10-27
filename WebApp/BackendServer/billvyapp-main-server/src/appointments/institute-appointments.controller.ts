import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { requestContext } from '../common/http/request-context';
import { CreateInstituteAppointmentDto } from './dto/create-institute-appointment.dto';
import { InstituteAppointmentsService } from './institute-appointments.service';

@ApiTags('Institute appointments')
@ApiBearerAuth()
@Controller('institute-appointments')
export class InstituteAppointmentsController {
  constructor(private readonly service: InstituteAppointmentsService) {}
  @Post()
  @Roles(RoleCode.STAFF)
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateInstituteAppointmentDto,
  ) {
    return this.service.create(actor, dto);
  }
  @Post(':id/retry-emails')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF)
  retry(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.retryEmails(actor, id);
  }
  @Post(':id/invoice')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER)
  invoice(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.service.invoice(actor, id, requestContext(req));
  }
}
