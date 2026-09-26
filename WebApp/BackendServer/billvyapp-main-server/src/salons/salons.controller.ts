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
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateSalonDto } from './dto/create-salon.dto';
import { GeocodeSalonDto } from './dto/geocode-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { PaginatedSalonsDto } from './dto/paginated-salons.dto';
import { SalonResponseDto } from './dto/salon-response.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { SalonsService } from './salons.service';

const SALON_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const SALON_WRITE_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.ADMIN] as const;

@ApiTags('Salons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get()
  @Roles(...SALON_READ_ROLES)
  @ApiOperation({
    summary: 'List salons',
    description:
      'SUPER_ADMIN: all salons. ADMIN: own franchise. MANAGER/STAFF: own salon only. CUSTOMER: active salons only (read-only, for booking).',
  })
  @ApiResponse({ status: 200, type: PaginatedSalonsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSalonsQueryDto,
  ) {
    return this.salonsService.list(user, query);
  }

  @Post()
  @Roles(...SALON_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a salon',
    description:
      'franchiseId is required and cannot be changed later. The franchise must exist.',
  })
  @ApiResponse({ status: 201, type: SalonResponseDto })
  @ApiResponse({ status: 404, description: 'Franchise not found' })
  @ApiResponse({
    status: 409,
    description: 'Salon code already exists in this franchise',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalonDto,
    @Req() req: Request,
  ) {
    return this.salonsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...SALON_READ_ROLES)
  @ApiOperation({
    summary: 'Get a salon by id',
    description:
      'Scoped like the list endpoint. CUSTOMER receives 404 for inactive salons.',
  })
  @ApiResponse({ status: 200, type: SalonResponseDto })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salonsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...SALON_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a salon',
    description:
      'franchiseId is immutable. id, createdAt, updatedAt and isActive are not accepted.',
  })
  @ApiResponse({ status: 200, type: SalonResponseDto })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({
    status: 409,
    description: 'Salon code already exists in this franchise',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalonDto,
    @Req() req: Request,
  ) {
    return this.salonsService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...SALON_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a salon',
    description:
      'Soft status change only. Salons are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: SalonResponseDto })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.salonsService.updateStatus(user, id, dto, requestContext(req));
  }

  @Post(':id/geocode')
  @Roles(...SALON_WRITE_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Geocode a salon via Google Maps',
    description:
      'Requires GOOGLE_MAPS_API_KEY. Provide address and/or placeId (at least one). Updates googlePlaceId, mapAddress, and latitude/longitude when Google returns coordinates.',
  })
  @ApiResponse({ status: 200, type: SalonResponseDto })
  @ApiResponse({ status: 400, description: 'Geocoding failed or invalid input' })
  @ApiResponse({
    status: 503,
    description: 'Google Maps API key is not configured',
  })
  geocode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GeocodeSalonDto,
    @Req() req: Request,
  ) {
    return this.salonsService.geocode(user, id, dto, requestContext(req));
  }
}
