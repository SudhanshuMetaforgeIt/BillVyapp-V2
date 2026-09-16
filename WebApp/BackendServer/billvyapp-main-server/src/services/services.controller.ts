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
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateServiceDto } from './dto/create-service.dto';
import { PaginatedServicesDto } from './dto/paginated-services.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

const CATALOG_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const CATALOG_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Services')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({
    summary: 'List services',
    description:
      'CUSTOMER callers receive active services only (price and duration included). STAFF is read-only. Designed for later consumption by the customer mobile app.',
  })
  @ApiResponse({ status: 200, type: PaginatedServicesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ServiceQueryDto,
  ) {
    return this.servicesService.list(user, query);
  }

  @Post()
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a service',
    description:
      'Requires salonId, categoryId, name, durationMinutes and price. The category must belong to the same salon. Duplicate names in a salon return 409.',
  })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid salon/category pairing or inactive salon',
  })
  @ApiResponse({ status: 404, description: 'Salon or category not found' })
  @ApiResponse({
    status: 409,
    description: 'Service name already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
    @Req() req: Request,
  ) {
    return this.servicesService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.servicesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a service',
    description:
      'Does not accept id, salonId, createdAt, updatedAt or isActive. A new categoryId must belong to the same salon.',
  })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({
    status: 409,
    description: 'Service name already exists in this salon',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @Req() req: Request,
  ) {
    return this.servicesService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a service',
    description:
      'Soft status change only. Services are never physically deleted so appointment and bill history stay intact.',
  })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.servicesService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
