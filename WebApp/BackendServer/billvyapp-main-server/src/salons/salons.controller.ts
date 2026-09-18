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
import { CreateSalonDto } from './dto/create-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { PaginatedSalonsDto } from './dto/paginated-salons.dto';
import { SalonResponseDto } from './dto/salon-response.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { SalonsService } from './salons.service';

@ApiTags('Salons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN)
@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get()
  @ApiOperation({ summary: 'List salons across all franchises' })
  @ApiResponse({ status: 200, type: PaginatedSalonsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSalonsQueryDto,
  ) {
    return this.salonsService.list(user, query);
  }

  @Post()
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
  @ApiOperation({ summary: 'Get a salon by id' })
  @ApiResponse({ status: 200, type: SalonResponseDto })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salonsService.findOne(user, id);
  }

  @Patch(':id')
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
}
